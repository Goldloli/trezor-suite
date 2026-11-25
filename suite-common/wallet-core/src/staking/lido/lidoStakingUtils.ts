import { type LidoWithdrawalRequestStatus } from '@trezor/network-ethereum-suite-common';
import { BigNumber } from '@trezor/utils';

const WSTETH_DECIMALS = 18;

export type LidoWithdrawalRequest = {
    id: string;
    amountOfStETH: string;
    requestedAt: number;
    isFinalized: boolean;
};

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
