import { getAvailableAmount, getStakingRatio } from '@suite-common/assets';
import {
    formatStakingAmount,
    selectAccountCryptoBalanceWithStaking,
    selectStakingAccountAmount,
} from '@suite-common/earn-staking';
import { isSupportedStakingNetworkSymbol, selectAccountByKey } from '@suite-common/wallet-core';
import { type AccountKey } from '@suite-common/wallet-types';
import { isPositiveBalance } from '@suite-common/wallet-utils';

import { StakingSplitCard } from '#src/components/wallet/assets/StakingSplitCard';
import { useOpenAccountStaking } from '#src/components/wallet/assets/useOpenAccountStaking';
import { useStakingRate } from '#src/hooks/earn/useStakingRate';
import { useSelector } from '#src/hooks/suite/useSelector';

type AccountAssetEarnProps = {
    accountKey: AccountKey;
};

/** The account's coin split as the asset detail splits the wallet's; View all opens Staking. */
export const AccountAssetEarn = ({ accountKey }: AccountAssetEarnProps) => {
    const openAccountStaking = useOpenAccountStaking('account-overview');
    const networkSymbol = useSelector(state => selectAccountByKey(state, accountKey)?.symbol);
    const amount = useSelector(state => selectAccountCryptoBalanceWithStaking(state, accountKey));
    const stakingAmount = useSelector(state =>
        networkSymbol === undefined
            ? '0'
            : formatStakingAmount({
                  amount: selectStakingAccountAmount(state, accountKey),
                  networkSymbol,
              }),
    );
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
        <StakingSplitCard
            networkSymbol={networkSymbol}
            availableAmount={availableAmount}
            stakingAmount={stakingAmount}
            stakingRatio={stakingRatio}
            apy={apy}
            onViewAll={() => openAccountStaking(networkSymbol)}
            data-testid="@wallet/account-assets/earn"
        />
    );
};
