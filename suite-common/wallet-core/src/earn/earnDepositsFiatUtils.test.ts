import { toTokenAddress } from '@suite-common/tokens';
import { asNetworkSymbol } from '@suite-common/wallet-config';
import {
    type Rate,
    type RatesByKey,
    type TickerId,
    asCryptoBaseCurrencyCode,
    asTimestamp,
} from '@suite-common/wallet-types';

import { type EarnFiatPosition, getEarnPositionFiatAmount } from './earnDepositsFiatUtils';

const ethSymbol = asNetworkSymbol('eth');
const adaSymbol = asNetworkSymbol('ada');
const usdcContract = toTokenAddress('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');

const adaFiatRateKey = asCryptoBaseCurrencyCode('ada-usd');
const usdcFiatRateKey = asCryptoBaseCurrencyCode(`eth-${usdcContract}-usd`);

const adaPosition: EarnFiatPosition = {
    tickerId: { symbol: adaSymbol },
    fiatRateKey: adaFiatRateKey,
    balance: '5',
};

const usdcPosition: EarnFiatPosition = {
    tickerId: { symbol: ethSymbol, tokenAddress: usdcContract },
    fiatRateKey: usdcFiatRateKey,
    balance: '100',
};

const createRate = (ticker: TickerId, rate: number | undefined): Rate => ({
    rate,
    lastTickerTimestamp: asTimestamp(0),
    lastSuccessfulFetchTimestamp: asTimestamp(0),
    isLoading: false,
    error: null,
    ticker,
});

const createRates = (entries: [EarnFiatPosition, number | undefined][]): RatesByKey =>
    entries.reduce<RatesByKey>((ratesByKey, [{ fiatRateKey, tickerId }, rate]) => {
        ratesByKey[fiatRateKey] = createRate(tickerId, rate);

        return ratesByKey;
    }, {});

describe(getEarnPositionFiatAmount.name, () => {
    it('multiplies the balance by the rate found under the position rate key', () => {
        const fiatAmount = getEarnPositionFiatAmount(
            adaPosition,
            createRates([[adaPosition, 0.5]]),
        );

        expect(fiatAmount?.toFixed()).toBe('2.5');
    });

    it('returns null when the rate is missing or rates are not loaded', () => {
        expect(getEarnPositionFiatAmount(adaPosition, createRates([]))).toBeNull();
        expect(
            getEarnPositionFiatAmount(adaPosition, createRates([[adaPosition, undefined]])),
        ).toBeNull();
        expect(getEarnPositionFiatAmount(adaPosition, undefined)).toBeNull();
    });

    it('values testnet positions at zero instead of reporting a missing rate', () => {
        const hoodiPosition: EarnFiatPosition = {
            tickerId: { symbol: asNetworkSymbol('thod') },
            fiatRateKey: asCryptoBaseCurrencyCode('thod-usd'),
            balance: '32',
        };

        expect(getEarnPositionFiatAmount(hoodiPosition, undefined)?.toFixed()).toBe('0');
    });

    it('looks up token positions by their token rate key', () => {
        const fiatAmount = getEarnPositionFiatAmount(
            usdcPosition,
            createRates([
                [adaPosition, 0.5],
                [usdcPosition, 1],
            ]),
        );

        expect(fiatAmount?.toFixed()).toBe('100');
    });
});
