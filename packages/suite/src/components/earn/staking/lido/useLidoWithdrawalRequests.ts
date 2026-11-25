import { commonQueryKeys, useQuery } from '@suite-common/react-query';
import { type LidoWithdrawalRequest, fetchLidoWithdrawalRequests } from '@suite-common/wallet-core';
import { type Account } from '@suite-common/wallet-types';
import { getLidoDeployment } from '@trezor/network-ethereum-suite-common';

// The queue finalizes requests with the daily oracle report, so a slow poll is enough.
const REFETCH_INTERVAL_MS = 5 * 60 * 1000;

const NO_REQUESTS: readonly LidoWithdrawalRequest[] = [];

export type LidoWithdrawalRequests = {
    pendingRequests: readonly LidoWithdrawalRequest[];
    claimableRequests: readonly LidoWithdrawalRequest[];
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
};

/**
 * The account's withdrawal requests, read from the queue contract: the position cannot carry
 * them, since the account data the backend sends does not include them.
 */
export const useLidoWithdrawalRequests = (account: Account): LidoWithdrawalRequests => {
    const deployment = getLidoDeployment(account.symbol);

    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- cache identity is account.key; the queryFn passes the full account for its descriptor and backend identity, and the deployment follows from the account's network
    const query = useQuery({
        queryKey: commonQueryKeys.lidoWithdrawalRequests(account.key),
        queryFn: () =>
            deployment === null ? [] : fetchLidoWithdrawalRequests({ account, deployment }),
        enabled: deployment !== null,
        refetchInterval: REFETCH_INTERVAL_MS,
    });
    const { data: requests = NO_REQUESTS, isLoading, isError, refetch } = query;

    return {
        pendingRequests: requests.filter(request => !request.isFinalized),
        claimableRequests: requests.filter(request => request.isFinalized),
        isLoading,
        isError,
        refetch: () => void refetch(),
    };
};
