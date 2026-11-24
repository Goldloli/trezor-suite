import { useSelector } from 'react-redux';

import { selectBaseCurrency, useMissingRateTickersQuery } from '@suite-common/wallet-core';
import { type AccountKey } from '@suite-common/wallet-types';

import {
    type AccountAssetsRootState,
    selectAccountAssetMissingRateTickerIds,
} from './accountAssetSelectors';

/** Fetches the rates the account's total lacks; loading while they are on their way. */
export const useAccountAssetMissingRateTickersQuery = (accountKey: AccountKey) => {
    const baseCurrency = useSelector(selectBaseCurrency);
    const missingRateTickers = useSelector((state: AccountAssetsRootState) =>
        selectAccountAssetMissingRateTickerIds(state, accountKey),
    );
    const { isFetching } = useMissingRateTickersQuery({
        missingRateTickers,
        baseCurrencyCode: baseCurrency,
    });

    return { isFiatRatesLoading: isFetching };
};
