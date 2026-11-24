import {
    formatStakingAmount,
    selectAccountCryptoBalanceWithStaking,
    selectStakingAccountAmount,
} from '@suite-common/earn-staking';
import { type TokenAddress, type TokenInfoBranded, type TokenSymbol } from '@suite-common/tokens';
import { type NetworkSymbol } from '@suite-common/wallet-config';
import {
    type FiatValuation,
    createStableTickerIds,
    getIsFiatTotalIncomplete,
    getIsFiatTotalUnavailable,
    getMissingRateTickerIds,
    hasAnyFiatRate,
    selectAccountByKey,
    selectBaseCurrency,
    selectCurrentFiatRates,
    selectIsTokenFiatRateDisallowed,
    sumFiatValuations,
} from '@suite-common/wallet-core';
import { type Account, type AccountKey } from '@suite-common/wallet-types';
import {
    getFiatRateKey,
    isPositiveBalance,
    isTestnet,
    toFiatCurrency,
} from '@suite-common/wallet-utils';
import { createWeakMapSelector, returnStableArrayIfEmpty } from '@trezor/redux-utils';

import {
    type AccountListSectionsRootState,
    selectAccountListSectionsWithVaultTokens,
} from './accountListSections';
import { getAvailableAmount, getStakingRatio } from './stakingSplitUtils';

export type AccountAssetsRootState = AccountListSectionsRootState;

const createMemoizedSelector = createWeakMapSelector.withTypes<AccountAssetsRootState>();

/** A row of the account's asset table: its coin, what it stakes of it, or a token. */
export type AccountAssetRow = {
    key: string;
    kind: 'coin' | 'staking' | 'token';
    networkSymbol: NetworkSymbol;
    contractAddress: TokenAddress | undefined;
    tokenSymbol: TokenSymbol | null;
    tokenDecimals: number | undefined;
    amount: string;
};

const toCoinRow = (
    account: Account,
    kind: 'coin' | 'staking',
    amount: string,
): AccountAssetRow => ({
    key: kind,
    kind,
    networkSymbol: account.symbol,
    contractAddress: undefined,
    tokenSymbol: null,
    tokenDecimals: undefined,
    amount,
});

const toTokenRow = (account: Account, token: TokenInfoBranded): AccountAssetRow => ({
    key: token.contract,
    kind: 'token',
    networkSymbol: account.symbol,
    contractAddress: token.contract,
    tokenSymbol: token.symbol,
    tokenDecimals: token.decimals,
    amount: token.balance ?? '0',
});

/**
 * What the account holds, as the mobile account overview lists it: the coin, the stake on a row
 * of its own, then the tokens by value. Nothing held is left out.
 */
export const selectAccountAssetRows = createMemoizedSelector(
    [selectAccountListSectionsWithVaultTokens],
    (sections): readonly AccountAssetRow[] =>
        returnStableArrayIfEmpty(
            sections.flatMap((section): AccountAssetRow[] => {
                switch (section.type) {
                    case 'account':
                        return isPositiveBalance(section.account.formattedBalance)
                            ? [toCoinRow(section.account, 'coin', section.account.formattedBalance)]
                            : [];
                    case 'staking':
                        return isPositiveBalance(section.stakingCryptoBalance)
                            ? [toCoinRow(section.account, 'staking', section.stakingCryptoBalance)]
                            : [];
                    case 'token':
                        return [toTokenRow(section.account, section.token)];
                    case 'zeroBalance':
                    default:
                        return [];
                }
            }),
        ),
);

/** The tokens the account knows but holds none of, which the table keeps in a group of their own. */
export const selectAccountZeroBalanceAssetRows = createMemoizedSelector(
    [selectAccountListSectionsWithVaultTokens],
    (sections): readonly AccountAssetRow[] =>
        returnStableArrayIfEmpty(
            sections.flatMap(section =>
                section.type === 'zeroBalance'
                    ? section.tokens.map(token => toTokenRow(section.account, token))
                    : [],
            ),
        ),
);

/** What the account stakes of its coin, in the coin's units. */
export const selectAccountStakingAmount = (
    state: AccountAssetsRootState,
    accountKey: AccountKey,
) => {
    const account = selectAccountByKey(state, accountKey);

    return account === null
        ? '0'
        : formatStakingAmount({
              amount: selectStakingAccountAmount(state, accountKey),
              networkSymbol: account.symbol,
          });
};

/** What the account holds of its coin without what it stakes. */
export const selectAccountAvailableAmount = (
    state: AccountAssetsRootState,
    accountKey: AccountKey,
) =>
    getAvailableAmount(
        selectAccountCryptoBalanceWithStaking(state, accountKey),
        selectAccountStakingAmount(state, accountKey),
    );

/** The share of the account's coin that is staked. */
export const selectAccountStakingRatio = (state: AccountAssetsRootState, accountKey: AccountKey) =>
    getStakingRatio(
        selectAccountCryptoBalanceWithStaking(state, accountKey),
        selectAccountStakingAmount(state, accountKey),
    );

/**
 * What each asset the account holds is worth; null where it has no rate. The coin is valued with
 * its stake counted in once, as the account's balance counts it, whatever rows show it.
 */
const selectAccountAssetFiatValuations = createMemoizedSelector(
    [
        selectAccountByKey,
        selectAccountCryptoBalanceWithStaking,
        selectAccountAssetRows,
        selectCurrentFiatRates,
        selectBaseCurrency,
    ],
    (account, coinAmount, rows, rates, baseCurrency): readonly FiatValuation[] => {
        if (account === null) {
            return returnStableArrayIfEmpty([]);
        }

        const toValuation = (
            amount: string,
            tokenAddress: TokenAddress | undefined,
        ): FiatValuation => {
            const rate = rates?.[getFiatRateKey(account.symbol, baseCurrency, tokenAddress)]?.rate;

            return {
                tickerId: { symbol: account.symbol, tokenAddress },
                fiatAmount: rate === undefined ? null : toFiatCurrency({ amount, rate }),
            };
        };

        return returnStableArrayIfEmpty([
            ...(isPositiveBalance(coinAmount) ? [toValuation(coinAmount, undefined)] : []),
            ...rows
                .filter(row => row.kind === 'token')
                .map(row => toValuation(row.amount, row.contractAddress)),
        ]);
    },
);

/** How many assets the account holds: its coin and each token, the stake being the coin's. */
export const selectAccountAssetCount = (state: AccountAssetsRootState, accountKey: AccountKey) =>
    selectAccountAssetFiatValuations(state, accountKey).length;

/**
 * What the account is worth. Zero once it holds nothing; undefined while nothing it holds can be
 * priced, as a total of zero would say it is empty.
 */
export const selectAccountAssetTotalFiatValue = (
    state: AccountAssetsRootState,
    accountKey: AccountKey,
): string | undefined => {
    const valuations = selectAccountAssetFiatValuations(state, accountKey);

    if (valuations.length === 0) {
        return '0';
    }

    return hasAnyFiatRate(valuations) ? sumFiatValuations(valuations) : undefined;
};

/**
 * The rates the account's total lacks and that are worth fetching. A testnet is never priced and a
 * token whose rate is not fetched never gets one, so neither is asked for.
 */
export const selectAccountAssetMissingRateTickerIds = (
    state: AccountAssetsRootState,
    accountKey: AccountKey,
) =>
    createStableTickerIds(
        ...getMissingRateTickerIds(selectAccountAssetFiatValuations(state, accountKey)).filter(
            ({ symbol, tokenAddress }) =>
                !isTestnet(symbol) && !selectIsTokenFiatRateDisallowed(state, symbol, tokenAddress),
        ),
    );

/** Whether the total leaves out a held asset that has no rate, once no rate is on its way. */
export const selectIsAccountAssetFiatTotalIncomplete = (
    state: AccountAssetsRootState,
    accountKey: AccountKey,
    isFiatRatesLoading: boolean,
) =>
    getIsFiatTotalIncomplete(
        selectAccountAssetFiatValuations(state, accountKey),
        isFiatRatesLoading,
    );

/** Whether nothing the account holds can be priced, so there is no total to show. */
export const selectIsAccountAssetFiatTotalUnavailable = (
    state: AccountAssetsRootState,
    accountKey: AccountKey,
    isFiatRatesLoading: boolean,
) =>
    getIsFiatTotalUnavailable(
        selectAccountAssetFiatValuations(state, accountKey),
        isFiatRatesLoading,
    );
