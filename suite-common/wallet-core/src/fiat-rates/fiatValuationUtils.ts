import { A, F } from '@mobily/ts-belt';

import { type BaseCurrencyAmount, type TickerId } from '@suite-common/wallet-types';
import { BigNumber } from '@trezor/utils';

/** What something held is worth in the base currency; null while it has no rate. */
export type FiatValuation = {
    tickerId: TickerId;
    fiatAmount: BaseCurrencyAmount | null;
};

export const getUniqueTickers = (tickers: TickerId[]): TickerId[] =>
    F.toMutable(
        A.uniqBy(tickers, ticker =>
            ticker.tokenAddress ? `${ticker.symbol}-${ticker.tokenAddress}` : ticker.symbol,
        ),
    );

export const sumFiatValuations = (valuations: readonly FiatValuation[]): string =>
    valuations
        .reduce(
            (total, { fiatAmount }) => (fiatAmount === null ? total : total.plus(fiatAmount)),
            new BigNumber(0),
        )
        .toString();

export const getMissingRateTickerIds = (valuations: readonly FiatValuation[]): TickerId[] =>
    getUniqueTickers(
        valuations.filter(({ fiatAmount }) => fiatAmount === null).map(({ tickerId }) => tickerId),
    );

export const hasAnyFiatRate = (valuations: readonly FiatValuation[]): boolean =>
    valuations.some(({ fiatAmount }) => fiatAmount !== null);
