import { Translation } from '@suite/intl';
import { selectHomeAssetTotals } from '@suite-common/assets';

import { TotalBalanceCard } from '#src/components/wallet/assets/TotalBalanceCard';
import { TotalBalanceHeadline } from '#src/components/wallet/assets/TotalBalanceHeadline';
import { useDiscovery } from '#src/hooks/suite/useDiscovery';
import { useSelector } from '#src/hooks/suite/useSelector';

import { HomeBalanceChange } from './HomeBalanceChange';

export const HomeBalanceCard = () => {
    const { isDiscoveryRunning } = useDiscovery();
    const { fiatValue, weekChange, weekChangePercent } = useSelector(selectHomeAssetTotals);

    return (
        <TotalBalanceCard
            label={<Translation id="TR_HOME_ASSET_TOTAL_BALANCE" />}
            isLoading={isDiscoveryRunning}
        >
            <TotalBalanceHeadline
                fiatValue={fiatValue}
                data-testid="@dashboard/home-asset/fiat-amount"
            />
            {weekChange !== undefined && (
                <HomeBalanceChange
                    period={<Translation id="TR_HOME_ASSET_WEEK_PERIOD" />}
                    change={weekChange}
                    changePercent={weekChangePercent}
                    data-testid="@dashboard/home-asset/week-change"
                />
            )}
        </TotalBalanceCard>
    );
};
