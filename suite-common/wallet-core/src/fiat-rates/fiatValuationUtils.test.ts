import { toTokenAddress } from '@suite-common/tokens';
import { asNetworkSymbol } from '@suite-common/wallet-config';
import { type TickerId, asBaseCurrencyAmount } from '@suite-common/wallet-types';
import { BigNumber } from '@trezor/utils';

import {
    type FiatValuation,
    getMissingRateTickerIds,
    hasAnyFiatRate,
    sumFiatValuations,
} from './fiatValuationUtils';

const ethSymbol = asNetworkSymbol('eth');
const adaSymbol = asNetworkSymbol('ada');
const usdcContract = toTokenAddress('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');

const adaTickerId: TickerId = { symbol: adaSymbol };
const usdcTickerId: TickerId = { symbol: ethSymbol, tokenAddress: usdcContract };

const createValuation = (tickerId: TickerId, fiatAmount: string | null): FiatValuation => ({
    tickerId,
    fiatAmount: fiatAmount === null ? null : asBaseCurrencyAmount(new BigNumber(fiatAmount)),
});

describe(sumFiatValuations.name, () => {
    it('sums valued positions and skips positions without a fiat amount', () => {
        const total = sumFiatValuations([
            createValuation(adaTickerId, '2.5'),
            createValuation(usdcTickerId, null),
            createValuation(usdcTickerId, '100'),
        ]);

        expect(total).toBe('102.5');
    });

    it('returns zero for no valuations', () => {
        expect(sumFiatValuations([])).toBe('0');
    });
});

describe(getMissingRateTickerIds.name, () => {
    it('lists each ticker without a fiat amount once', () => {
        const missingTickerIds = getMissingRateTickerIds([
            createValuation(adaTickerId, '2.5'),
            createValuation(usdcTickerId, null),
            createValuation({ symbol: ethSymbol, tokenAddress: usdcContract }, null),
            createValuation({ symbol: adaSymbol }, null),
        ]);

        expect(missingTickerIds).toEqual([usdcTickerId, { symbol: adaSymbol }]);
    });

    it('returns an empty list when every position is valued', () => {
        expect(getMissingRateTickerIds([createValuation(adaTickerId, '1')])).toEqual([]);
    });
});

describe(hasAnyFiatRate.name, () => {
    it('is true when at least one position has a fiat amount', () => {
        expect(
            hasAnyFiatRate([
                createValuation(adaTickerId, null),
                createValuation(usdcTickerId, '0'),
            ]),
        ).toBe(true);
    });

    it('is false when no position has a fiat amount', () => {
        expect(hasAnyFiatRate([createValuation(adaTickerId, null)])).toBe(false);
        expect(hasAnyFiatRate([])).toBe(false);
    });
});
