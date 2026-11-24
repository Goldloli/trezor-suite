import {
    formatStakingAmount,
    selectAccountCryptoBalanceWithStaking,
    selectStakingAccountAmount,
} from '@suite-common/earn-staking';
import {
    createStableTickerIds,
    getMissingRateTickerIds,
    hasAnyFiatRate,
    selectAccountByKey,
    selectIsTokenFiatRateDisallowed,
} from '@suite-common/wallet-core';
import { type AccountKey } from '@suite-common/wallet-types';
import { isTestnet } from '@suite-common/wallet-utils';

import {
    type HomeAssetTableState,
    selectShownWalletAssetFiatValuations,
} from './homeAssetTableSelectors';
import { getAvailableAmount, getStakingRatio } from './stakingSplitUtils';

/** What the account stakes of its coin, in the coin's units. */
export const selectAccountStakingAmount = (state: HomeAssetTableState, accountKey: AccountKey) => {
    const account = selectAccountByKey(state, accountKey);

    return account === null
        ? '0'
        : formatStakingAmount({
              amount: selectStakingAccountAmount(state, accountKey),
              networkSymbol: account.symbol,
          });
};

/** What the account holds of its coin without what it stakes. */
export const selectAccountAvailableAmount = (state: HomeAssetTableState, accountKey: AccountKey) =>
    getAvailableAmount(
        selectAccountCryptoBalanceWithStaking(state, accountKey),
        selectAccountStakingAmount(state, accountKey),
    );

/** The share of the account's coin that is staked. */
export const selectAccountStakingRatio = (state: HomeAssetTableState, accountKey: AccountKey) =>
    getStakingRatio(
        selectAccountCryptoBalanceWithStaking(state, accountKey),
        selectAccountStakingAmount(state, accountKey),
    );

const selectAccountAssetFiatValuations = (state: HomeAssetTableState, accountKey: AccountKey) =>
    selectShownWalletAssetFiatValuations(state, accountKey);

/**
 * The rates the account's total lacks and that are worth fetching. A testnet is never priced and a
 * token whose rate is not fetched never gets one, so neither is asked for.
 */
export const selectAccountAssetMissingRateTickerIds = (
    state: HomeAssetTableState,
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
    state: HomeAssetTableState,
    accountKey: AccountKey,
    isFiatRatesLoading: boolean,
) =>
    !isFiatRatesLoading &&
    selectAccountAssetFiatValuations(state, accountKey).some(
        ({ fiatAmount }) => fiatAmount === null,
    );

/** Whether nothing the account holds can be priced, so there is no total to show. */
export const selectIsAccountAssetFiatTotalUnavailable = (
    state: HomeAssetTableState,
    accountKey: AccountKey,
    isFiatRatesLoading: boolean,
) =>
    selectIsAccountAssetFiatTotalIncomplete(state, accountKey, isFiatRatesLoading) &&
    !hasAnyFiatRate(selectAccountAssetFiatValuations(state, accountKey));
