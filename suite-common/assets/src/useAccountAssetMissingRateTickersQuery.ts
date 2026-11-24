import { useSelector } from 'react-redux';

import { selectBaseCurrency, useMissingRateTickersQuery } from '@suite-common/wallet-core';
import { type AccountKey } from '@suite-common/wallet-types';

import { selectAccountAssetMissingRateTickerIds } from './accountAssetSelectors';
import { type HomeAssetTableState } from './homeAssetTableSelectors';

/** Fetches the rates the account's total lacks; loading while they are on their way. */
export const useAccountAssetMissingRateTickersQuery = (accountKey: AccountKey) => {
    const baseCurrency = useSelector(selectBaseCurrency);
    const missingRateTickers = useSelector((state: HomeAssetTableState) =>
        selectAccountAssetMissingRateTickerIds(state, accountKey),
    );
    const { isFetching } = useMissingRateTickersQuery({
        missingRateTickers,
        baseCurrencyCode: baseCurrency,
    });

    return { isFiatRatesLoading: isFetching };
};
