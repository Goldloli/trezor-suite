import { Translation } from '@suite/intl';
import {
    selectAccountFiatBalance,
    selectAccountListSectionsWithVaultTokens,
} from '@suite-common/assets';
import { type AccountKey } from '@suite-common/wallet-types';
import { isPositiveBalance } from '@suite-common/wallet-utils';
import { Box, Column } from '@trezor/components';

import { useSelector } from '#src/hooks/suite/useSelector';
import { useAccountHeaderContext } from '#src/support/suite/AccountHeaderProvider';
import { TotalBalanceCard } from '#src/views/home/HomeBalance/TotalBalanceCard';
import { TotalBalanceHeadline } from '#src/views/home/HomeBalance/TotalBalanceHeadline';

type AccountAssetBalanceProps = {
    accountKey: AccountKey;
};

/** What the account is worth in total, and how many assets make it up. */
export const AccountAssetBalance = ({ accountKey }: AccountAssetBalanceProps) => {
    // The coin counts once, whether it is held, staked or both; each token counts on its own.
    const assetCount = useSelector(state => {
        const sections = selectAccountListSectionsWithVaultTokens(state, accountKey);
        const isCoinHeld = sections.some(
            section =>
                (section.type === 'account' &&
                    isPositiveBalance(section.account.formattedBalance)) ||
                (section.type === 'staking' && isPositiveBalance(section.stakingCryptoBalance)),
        );

        return sections.filter(section => section.type === 'token').length + (isCoinHeld ? 1 : 0);
    });
    const fiatValue = useSelector(state => selectAccountFiatBalance(state, accountKey));
    const { balanceSectionRef } = useAccountHeaderContext();

    return (
        <Box ref={balanceSectionRef} flex="1" minWidth={280}>
            <TotalBalanceCard
                label={<Translation id="TR_ACCOUNT_ASSETS_BALANCE" />}
                labelAside={
                    <span data-testid="@wallet/account-assets/count">
                        <Translation id="TR_ACCOUNT_ASSETS_COUNT" values={{ count: assetCount }} />
                    </span>
                }
                isStretched
                data-testid="@wallet/account-assets/balance"
            >
                <Column alignItems="flex-start">
                    <TotalBalanceHeadline
                        fiatValue={fiatValue}
                        data-testid="@wallet/account-assets/fiat-amount"
                    />
                </Column>
            </TotalBalanceCard>
        </Box>
    );
};
