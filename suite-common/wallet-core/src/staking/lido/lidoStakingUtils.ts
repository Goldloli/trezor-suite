import { type WalletAccountTransaction } from '@suite-common/wallet-types';
import { isPending, isSignedByAccount } from '@suite-common/wallet-utils';
import {
    Calldata,
    LIDO_MAX_STETH_WITHDRAWAL_AMOUNT,
    LIDO_REFERRAL_ADDRESS,
    type LidoDeployment,
    type LidoWithdrawalRequestStatus,
    asEvmAddress,
} from '@trezor/network-ethereum-suite-common';
import { BigNumber } from '@trezor/utils';

const WSTETH_DECIMALS = 18;

// The wstETH value moves with every oracle report, so a request is kept a little under the 1000
// stETH the queue accepts: a report between the fee estimate and the block must not push it over.
const MAX_WITHDRAWAL_REQUEST_STETH_AMOUNT = new BigNumber(
    LIDO_MAX_STETH_WITHDRAWAL_AMOUNT.toString(),
)
    .times(999)
    .div(1000);

export type LidoTransactionData = {
    to: string;
    data: string;
    value?: string;
};

export type LidoWithdrawalRequest = {
    id: string;
    amountOfStETH: string;
    requestedAt: number;
    isFinalized: boolean;
};

export type LidoTransactionKind = 'stake' | 'approve' | 'request-withdrawal' | 'claim';

type ConvertWstETHToETHParams = {
    wstETHAmount: string;
    wstETHValue: string;
};

/** Amounts are in wei; `wstETHValue` is what one whole wstETH is worth in ETH. */
export const convertWstETHToETH = ({ wstETHAmount, wstETHValue }: ConvertWstETHToETHParams) =>
    new BigNumber(wstETHAmount)
        .times(wstETHValue)
        .shiftedBy(-WSTETH_DECIMALS)
        .integerValue(BigNumber.ROUND_DOWN)
        .toFixed(0);

type ConvertETHToWstETHParams = {
    ethAmount: string;
    wstETHValue: string;
};

export const convertETHToWstETH = ({ ethAmount, wstETHValue }: ConvertETHToWstETHParams) =>
    new BigNumber(ethAmount)
        .shiftedBy(WSTETH_DECIMALS)
        .div(wstETHValue)
        .integerValue(BigNumber.ROUND_DOWN)
        .toFixed(0);

type SplitLidoWithdrawalAmountParams = {
    wstETHAmount: string;
    wstETHValue: string;
};

export const splitLidoWithdrawalAmount = ({
    wstETHAmount,
    wstETHValue,
}: SplitLidoWithdrawalAmountParams): string[] => {
    const maxRequestAmount = new BigNumber(
        convertETHToWstETH({
            ethAmount: MAX_WITHDRAWAL_REQUEST_STETH_AMOUNT.toFixed(0),
            wstETHValue,
        }),
    );

    if (maxRequestAmount.lte(0)) {
        return [];
    }

    const requests: string[] = [];
    let remainingAmount = new BigNumber(wstETHAmount);

    while (remainingAmount.gt(0)) {
        const requestAmount = BigNumber.min(remainingAmount, maxRequestAmount);

        requests.push(requestAmount.toFixed(0));
        remainingAmount = remainingAmount.minus(requestAmount);
    }

    return requests;
};

type BuildLidoStakeTransactionParams = {
    deployment: LidoDeployment;
    ethAmount: string;
};

/** Stakes ETH and returns wstETH in one transaction, attributed to the Trezor referral address. */
export const buildLidoStakeTransaction = ({
    deployment,
    ethAmount,
}: BuildLidoStakeTransactionParams): LidoTransactionData | null => {
    const { data } = Calldata.evm.lido.stakeETH.encode({ referral: LIDO_REFERRAL_ADDRESS });

    if (data === null || !new BigNumber(ethAmount).gt(0)) {
        return null;
    }

    return {
        to: deployment.wstETHReferralStaker,
        data,
        value: `0x${BigInt(ethAmount).toString(16)}`,
    };
};

type BuildLidoApproveTransactionParams = {
    deployment: LidoDeployment;
    owner: string;
    wstETHAmount: string;
};

/** Lets the withdrawal queue take the wstETH a withdrawal request hands over. */
export const buildLidoApproveTransaction = ({
    deployment,
    owner,
    wstETHAmount,
}: BuildLidoApproveTransactionParams): LidoTransactionData | null => {
    const { data } = Calldata.evm.erc20.approve.encode(
        { spender: deployment.withdrawalQueue, amount: new BigNumber(wstETHAmount) },
        { sender: asEvmAddress(owner) },
    );

    return data === null ? null : { to: deployment.wstETH, data };
};

type BuildLidoRequestWithdrawalsTransactionParams = {
    deployment: LidoDeployment;
    owner: string;
    wstETHAmounts: readonly string[];
};

export const buildLidoRequestWithdrawalsTransaction = ({
    deployment,
    owner,
    wstETHAmounts,
}: BuildLidoRequestWithdrawalsTransactionParams): LidoTransactionData | null => {
    if (wstETHAmounts.length === 0) {
        return null;
    }

    const { data } = Calldata.evm.lido.requestWithdrawalsWstETH.encode(
        { amounts: wstETHAmounts.map(amount => new BigNumber(amount)), owner },
        { sender: asEvmAddress(owner) },
    );

    return data === null ? null : { to: deployment.withdrawalQueue, data };
};

type BuildLidoClaimWithdrawalsTransactionParams = {
    deployment: LidoDeployment;
    requestIds: readonly string[];
    hints: readonly string[];
};

export const buildLidoClaimWithdrawalsTransaction = ({
    deployment,
    requestIds,
    hints,
}: BuildLidoClaimWithdrawalsTransactionParams): LidoTransactionData | null => {
    if (requestIds.length === 0) {
        return null;
    }

    const { data } = Calldata.evm.lido.claimWithdrawals.encode({
        requestIds: requestIds.map(id => new BigNumber(id)),
        hints: hints.map(hint => new BigNumber(hint)),
    });

    return data === null ? null : { to: deployment.withdrawalQueue, data };
};

type ToLidoWithdrawalRequestsParams = {
    requestIds: readonly bigint[];
    statuses: readonly LidoWithdrawalRequestStatus[];
};

/** The requests still to be finalized or claimed, in the ascending order a claim needs. */
export const toLidoWithdrawalRequests = ({
    requestIds,
    statuses,
}: ToLidoWithdrawalRequestsParams): LidoWithdrawalRequest[] =>
    requestIds
        .flatMap((id, index) => {
            const status = statuses[index];

            if (status === undefined || status.isClaimed) return [];

            return [{ id, status }];
        })
        .toSorted((a, b) => (a.id < b.id ? -1 : 1))
        .map(({ id, status }) => ({
            id: id.toString(),
            amountOfStETH: status.amountOfStETH.toString(),
            requestedAt: Number(status.timestamp) * 1000,
            isFinalized: status.isFinalized,
        }));

type GetLidoTransactionKindParams = {
    deployment: LidoDeployment;
    to: string | undefined;
    data: string | undefined;
};

/**
 * The Lido call a transaction makes, told by its target and its calldata together: the selectors
 * alone are shared with other contracts.
 */
export const getLidoTransactionKind = ({
    deployment,
    to,
    data,
}: GetLidoTransactionKindParams): LidoTransactionKind | null => {
    const target = to?.toLowerCase();

    if (target === deployment.wstETHReferralStaker) {
        return Calldata.evm.lido.stakeETH.decode(data) === null ? null : 'stake';
    }

    if (target === deployment.wstETH) {
        const spender = Calldata.evm.erc20.approve.decode(data)?.spender.toLowerCase();

        return spender === deployment.withdrawalQueue ? 'approve' : null;
    }

    if (target !== deployment.withdrawalQueue) {
        return null;
    }

    if (Calldata.evm.lido.requestWithdrawalsWstETH.decode(data) !== null) {
        return 'request-withdrawal';
    }

    return Calldata.evm.lido.claimWithdrawals.decode(data) === null ? null : 'claim';
};

type GetAccountTransactionLidoKindParams = {
    deployment: LidoDeployment;
    transaction: WalletAccountTransaction;
};

export const getAccountTransactionLidoKind = ({
    deployment,
    transaction,
}: GetAccountTransactionLidoKindParams): LidoTransactionKind | null =>
    getLidoTransactionKind({
        deployment,
        // A pending token transfer the app records itself has no target, only the raw output.
        to: transaction.targets[0]?.addresses?.[0] ?? transaction.details.vout[0]?.addresses?.[0],
        data: transaction.ethereumSpecific?.data,
    });

type FindPendingLidoTransactionParams = {
    deployment: LidoDeployment;
    transactions: readonly WalletAccountTransaction[];
    kind: LidoTransactionKind;
};

/**
 * The account's own Lido transaction of the kind that is still to be mined. Read from the
 * account's transactions, so a flow finds it again after it was left and reopened.
 */
export const findPendingLidoTransaction = ({
    deployment,
    transactions,
    kind,
}: FindPendingLidoTransactionParams): WalletAccountTransaction | undefined =>
    transactions.find(
        transaction =>
            isPending(transaction) &&
            isSignedByAccount(transaction) &&
            getAccountTransactionLidoKind({ deployment, transaction }) === kind,
    );
