import { Translation } from '@suite/intl';
import {
    selectHomeAssetTotals,
    selectIsAccountAssetFiatTotalIncomplete,
    selectIsAccountAssetFiatTotalUnavailable,
    selectShownWalletAssetKeys,
    useAccountAssetMissingRateTickersQuery,
} from '@suite-common/assets';
import { type AccountKey } from '@suite-common/wallet-types';
import { Box, Column, Row } from '@trezor/components';

import { NoRatesTooltip } from '#src/components/suite/Ticker/NoRatesTooltip';
import { useSelector } from '#src/hooks/suite/useSelector';
import { useAccountHeaderContext } from '#src/support/suite/AccountHeaderProvider';
import {
    TOTAL_BALANCE_HEIGHT,
    TotalBalanceCard,
} from '#src/views/home/HomeBalance/TotalBalanceCard';
import { TotalBalanceHeadline } from '#src/views/home/HomeBalance/TotalBalanceHeadline';

type AccountAssetBalanceProps = {
    accountKey: AccountKey;
};

/** What the account is worth in total, and how many assets make it up. */
export const AccountAssetBalance = ({ accountKey }: AccountAssetBalanceProps) => {
    const assetCount = useSelector(state => selectShownWalletAssetKeys(state, accountKey).length);
    const { fiatValue } = useSelector(state => selectHomeAssetTotals(state, accountKey));
    const { isFiatRatesLoading } = useAccountAssetMissingRateTickersQuery(accountKey);
    const isIncomplete = useSelector(state =>
        selectIsAccountAssetFiatTotalIncomplete(state, accountKey, isFiatRatesLoading),
    );
    const isUnavailable = useSelector(state =>
        selectIsAccountAssetFiatTotalUnavailable(state, accountKey, isFiatRatesLoading),
    );
    const { balanceSectionRef } = useAccountHeaderContext();

    return (
        <Box flex="1" minWidth={280}>
            <TotalBalanceCard
                label={<Translation id="TR_ACCOUNT_ASSETS_BALANCE" />}
                labelAside={
                    <span data-testid="@wallet/account-assets/count">
                        <Translation id="TR_ACCOUNT_ASSETS_COUNT" values={{ count: assetCount }} />
                    </span>
                }
                // A total already priced in part stays while the rest is fetched.
                isLoading={fiatValue === undefined && isFiatRatesLoading}
                isStretched
                data-testid="@wallet/account-assets/balance"
            >
                <Column ref={balanceSectionRef} alignItems="flex-start">
                    <TotalBalanceHeadline
                        fiatValue={fiatValue}
                        isApproximate={isIncomplete}
                        data-testid="@wallet/account-assets/fiat-amount"
                    />
                    {/* Nothing is priced and no rate is on its way: say there is none. */}
                    {isUnavailable && (
                        <Row
                            height={TOTAL_BALANCE_HEIGHT}
                            alignItems="flex-start"
                            data-testid="@wallet/account-assets/no-rate"
                        >
                            <NoRatesTooltip />
                        </Row>
                    )}
                </Column>
            </TotalBalanceCard>
        </Box>
    );
};
