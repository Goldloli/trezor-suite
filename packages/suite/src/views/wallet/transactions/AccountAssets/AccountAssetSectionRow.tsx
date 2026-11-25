import { type AccountListSection, isStakeInsideAccountBalance } from '@suite-common/assets';
import { exhaustive } from '@trezor/type-utils';

import { AccountAssetRow } from './AccountAssetRow';
import { AccountStakingRow } from './AccountStakingRow';

type AccountAssetSectionRowProps = {
    section: AccountListSection;
};

/** The table row of one section of the account's asset list. */
export const AccountAssetSectionRow = ({ section }: AccountAssetSectionRowProps) => {
    switch (section.type) {
        case 'account':
            return (
                <AccountAssetRow
                    networkSymbol={section.account.symbol}
                    amount={section.account.formattedBalance}
                />
            );
        case 'staking':
            return (
                <AccountStakingRow
                    accountKey={section.account.key}
                    networkSymbol={section.account.symbol}
                    // A stake inside the balance would repeat the coin's amount, so mobile shows none.
                    amount={
                        isStakeInsideAccountBalance(section.account.symbol)
                            ? undefined
                            : section.stakingCryptoBalance
                    }
                />
            );
        case 'token':
            return (
                <AccountAssetRow
                    networkSymbol={section.account.symbol}
                    contractAddress={section.token.contract}
                    tokenSymbol={section.token.symbol}
                    tokenDecimals={section.token.decimals}
                    amount={section.token.balance ?? '0'}
                />
            );
        // The tokens held at zero are listed as token sections, never as the group itself.
        case 'zeroBalance':
            return null;
        default:
            return exhaustive(section);
    }
};
