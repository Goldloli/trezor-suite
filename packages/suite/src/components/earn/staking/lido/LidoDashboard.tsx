import { useEffect } from 'react';

import { Translation } from '@suite/intl';
import { useRefreshStakingProductInfo } from '@suite-common/earn-staking';
import { fetchAllTransactionsForAccountThunk } from '@suite-common/wallet-core';
import { type Account } from '@suite-common/wallet-types';
import { Banner, Column } from '@trezor/components';
import { useServices } from '@trezor/dependency-injection';
import { getLidoDeployment } from '@trezor/network-ethereum-suite-common';
import { injectDispatch } from '@trezor/redux-utils';

import { LidoClaimReadyBanner } from './LidoClaimReadyBanner';
import { LidoDetailsCard } from './LidoDetailsCard';
import { LidoStakedCard } from './LidoStakedCard';
import { LidoTransactions } from './LidoTransactions';
import { LidoWithdrawalCard } from './LidoWithdrawalCard';
import { useLidoStaking } from './useLidoStaking';
import { useLidoWithdrawalRequests } from './useLidoWithdrawalRequests';

type LidoDashboardProps = {
    account: Account;
};

/** The account's Lido staking, laid out as the universal earn detail is. */
export const LidoDashboard = ({ account }: LidoDashboardProps) => {
    const { dispatch } = useServices(injectDispatch);
    const accountKey = account.key;

    useRefreshStakingProductInfo();

    const { wstETHBalance, wstETHValue, withdrawalDays } = useLidoStaking(account);
    const { pendingRequests, claimableRequests } = useLidoWithdrawalRequests(account);
    const isStakeValueMissing = wstETHValue === null && wstETHBalance !== '0';
    const hasTodos = claimableRequests.length > 0 || pendingRequests.length > 0;

    useEffect(() => {
        dispatch(fetchAllTransactionsForAccountThunk({ accountKey, noLoading: true }));
    }, [accountKey, dispatch]);

    if (getLidoDeployment(account.symbol) === null) {
        return (
            <Banner intent="warning" description={<Translation id="TR_EARN_LIDO_UNAVAILABLE" />} />
        );
    }

    return (
        <Column gap={24} alignItems="stretch" data-testid="@staking/lido-dashboard/container">
            <Column
                gap={16}
                alignItems="stretch"
                width="100%"
                maxWidth={480}
                margin={{ horizontal: 'auto' }}
            >
                {isStakeValueMissing && (
                    <Banner
                        intent="warning"
                        description={<Translation id="TR_EARN_LIDO_VALUE_UNKNOWN" />}
                    />
                )}

                <LidoStakedCard account={account} />

                {hasTodos && (
                    <Column gap={8} alignItems="stretch">
                        <LidoClaimReadyBanner
                            account={account}
                            claimableRequests={claimableRequests}
                        />

                        {pendingRequests.map(request => (
                            <LidoWithdrawalCard
                                key={request.id}
                                request={request}
                                symbol={account.symbol}
                                withdrawalDays={withdrawalDays}
                            />
                        ))}
                    </Column>
                )}

                <LidoDetailsCard account={account} />
            </Column>

            <LidoTransactions account={account} />
        </Column>
    );
};
