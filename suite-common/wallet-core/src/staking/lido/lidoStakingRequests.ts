import { type Account } from '@suite-common/wallet-types';
import { getAccountIdentity } from '@suite-common/wallet-utils';
import TrezorConnect from '@trezor/connect';
import { asCoinSymbol } from '@trezor/connect-common';
import { LidoContractReads, type LidoDeployment } from '@trezor/network-ethereum-suite-common';

import { type LidoWithdrawalRequest, toLidoWithdrawalRequests } from './lidoStakingUtils';

type CallLidoContractParams = {
    account: Account;
    to: string;
    data: string;
};

const callLidoContract = async ({ account, to, data }: CallLidoContractParams) => {
    const response = await TrezorConnect.blockchainEvmRpcCall({
        coin: asCoinSymbol(account.symbol),
        identity: getAccountIdentity(account),
        from: account.descriptor,
        to,
        data,
    });

    if (!response.success) {
        throw new Error(response.error.message);
    }

    return response.payload.data;
};

type FetchLidoWithdrawalRequestsParams = {
    account: Account;
    deployment: LidoDeployment;
};

/** The account's withdrawal requests that are still to be finalized or claimed. */
export const fetchLidoWithdrawalRequests = async ({
    account,
    deployment,
}: FetchLidoWithdrawalRequestsParams): Promise<LidoWithdrawalRequest[]> => {
    const requestIds = LidoContractReads.getWithdrawalRequests.decode(
        await callLidoContract({
            account,
            to: deployment.withdrawalQueue,
            data: LidoContractReads.getWithdrawalRequests.encode({ owner: account.descriptor }),
        }),
    );

    if (requestIds.length === 0) {
        return [];
    }

    const statuses = LidoContractReads.getWithdrawalStatus.decode(
        await callLidoContract({
            account,
            to: deployment.withdrawalQueue,
            data: LidoContractReads.getWithdrawalStatus.encode({ requestIds }),
        }),
    );

    return toLidoWithdrawalRequests({ requestIds, statuses });
};
