import { events, injectDesktopAnalytics } from '@suite/analytics';
import { gotoThunk } from '@suite/router';
import {
    getAvailableAmount,
    getStakingRatio,
    selectAccountListSectionsWithVaultTokens,
} from '@suite-common/assets';
import { selectAccountCryptoBalanceWithStaking } from '@suite-common/earn-staking';
import { isSupportedStakingNetworkSymbol, selectAccountByKey } from '@suite-common/wallet-core';
import { type AccountKey } from '@suite-common/wallet-types';
import { isPositiveBalance } from '@suite-common/wallet-utils';
import { useServices } from '@trezor/dependency-injection';
import { injectDispatch } from '@trezor/redux-utils';

import { useStakingRate } from '#src/hooks/earn/useStakingRate';
import { useSelector } from '#src/hooks/suite/useSelector';
import { AssetDetailEarnCard } from '#src/views/home/AssetDetail/AssetDetailEarnCard';

type AccountAssetEarnProps = {
    accountKey: AccountKey;
};

/** The account's coin split as the asset detail splits the wallet's; View all opens Staking. */
export const AccountAssetEarn = ({ accountKey }: AccountAssetEarnProps) => {
    const { analytics, dispatch } = useServices(injectDesktopAnalytics, injectDispatch);
    const networkSymbol = useSelector(state => selectAccountByKey(state, accountKey)?.symbol);
    const amount = useSelector(state => selectAccountCryptoBalanceWithStaking(state, accountKey));
    // What the account stakes is what its list shows on the stake's row.
    const stakingAmount = useSelector(state => {
        const staking = selectAccountListSectionsWithVaultTokens(state, accountKey).find(
            section => section.type === 'staking',
        );

        return staking?.type === 'staking' ? staking.stakingCryptoBalance : '0';
    });
    const availableAmount = getAvailableAmount(amount, stakingAmount);
    const stakingRatio = getStakingRatio(amount, stakingAmount) ?? 0;
    const { rate: apy } = useStakingRate({ symbol: networkSymbol, accountKey });

    if (
        networkSymbol === undefined ||
        !isSupportedStakingNetworkSymbol(networkSymbol) ||
        !isPositiveBalance(amount) ||
        availableAmount === undefined
    ) {
        return null;
    }

    return (
        <AssetDetailEarnCard
            networkSymbol={networkSymbol}
            availableAmount={availableAmount}
            stakingAmount={stakingAmount}
            stakingRatio={stakingRatio}
            apy={apy}
            onViewAll={() => {
                analytics.report({
                    type: events.navigateFlowEvent.name,
                    payload: {
                        action: 'navigate',
                        type: 'earn',
                        from: 'account-overview',
                        networkSymbol,
                    },
                });
                dispatch(gotoThunk({ routeName: 'wallet-staking', preserveParams: true }));
            }}
            data-testid="@wallet/account-assets/earn"
        />
    );
};
