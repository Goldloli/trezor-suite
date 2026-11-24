import { selectBaseCurrency, selectCurrentFiatRates } from '@suite-common/wallet-core';
import { type AccountKey } from '@suite-common/wallet-types';
import { getFiatRateKey, isPositiveBalance, toFiatCurrency } from '@suite-common/wallet-utils';
import { createWeakMapSelector } from '@trezor/redux-utils';
import { BigNumber } from '@trezor/utils';

import {
    type AccountListSection,
    selectAccountListSectionsWithVaultTokens,
} from './accountListSections';
import {
    type HomeAssetTableState,
    type SmallBalanceSummary,
    selectSmallBalanceFiatThreshold,
} from './homeAssetTableSelectors';

const createMemoizedSelector = createWeakMapSelector.withTypes<HomeAssetTableState>();

/** What tells a section of an account's list from the others: its coin, its stake, or a token. */
export const getAccountListSectionKey = (section: AccountListSection) => {
    switch (section.type) {
        case 'account':
            return 'coin';
        case 'token':
            return section.token.contract;
        default:
            return section.type;
    }
};

const getHeldAmount = (section: AccountListSection) => {
    switch (section.type) {
        case 'account':
            return { amount: section.account.formattedBalance, tokenAddress: undefined };
        case 'staking':
            return { amount: section.stakingCryptoBalance, tokenAddress: undefined };
        case 'token':
            return {
                amount: section.token.balance ?? '0',
                tokenAddress: section.token.contract,
            };
        default:
            return undefined;
    }
};

export type AccountSmallBalances = {
    /** The keys of the sections worth under a dollar, as `getAccountListSectionKey` gives them. */
    keys: ReadonlySet<string>;
    summary: SmallBalanceSummary | undefined;
};

/**
 * What the account holds that is worth under a dollar, by the threshold the Home table uses. A
 * section without a rate is never small, so nothing is hidden by mistake.
 */
export const selectAccountSmallBalances = createMemoizedSelector(
    [
        (state: HomeAssetTableState, accountKey: AccountKey) =>
            selectAccountListSectionsWithVaultTokens(state, accountKey),
        selectCurrentFiatRates,
        selectBaseCurrency,
        (state: HomeAssetTableState) => selectSmallBalanceFiatThreshold(state),
    ],
    (sections, rates, baseCurrency, threshold): AccountSmallBalances => {
        const keys = new Set<string>();
        let fiatValue = new BigNumber(0);

        if (threshold !== undefined) {
            sections.forEach(section => {
                const held = getHeldAmount(section);

                if (held === undefined || !isPositiveBalance(held.amount)) {
                    return;
                }

                const rate =
                    rates?.[getFiatRateKey(section.account.symbol, baseCurrency, held.tokenAddress)]
                        ?.rate;
                const value =
                    rate === undefined ? null : toFiatCurrency({ amount: held.amount, rate });

                if (value?.lt(threshold)) {
                    keys.add(getAccountListSectionKey(section));
                    fiatValue = fiatValue.plus(value);
                }
            });
        }

        return {
            keys,
            summary: keys.size === 0 ? undefined : { assetCount: keys.size, fiatValue },
        };
    },
);
