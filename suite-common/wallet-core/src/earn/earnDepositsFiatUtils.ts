import {
    type BaseCurrencyAmount,
    type CryptoBaseCurrencyPair,
    type RatesByKey,
    type TickerId,
    asBaseCurrencyAmount,
} from '@suite-common/wallet-types';
import { isTestnet, toFiatCurrency } from '@suite-common/wallet-utils';
import { BigNumber } from '@trezor/utils';

export type EarnFiatPosition = {
    tickerId: TickerId;
    fiatRateKey: CryptoBaseCurrencyPair;
    balance: string;
};

export const getTokenFiatRate = (
    currentFiatRates: RatesByKey | undefined,
    fiatRateKey: CryptoBaseCurrencyPair,
): number | undefined => {
    if (!currentFiatRates) {
        return undefined;
    }

    const exactRate = currentFiatRates[fiatRateKey]?.rate;
    if (exactRate !== undefined) {
        return exactRate;
    }

    // Rates fetched for account tokens use the blockbook contract-address casing,
    // which may differ from the casing returned by the yield provider.
    const lowerCasedFiatRateKey = fiatRateKey.toLowerCase();
    const caseInsensitiveMatch = Object.entries(currentFiatRates).find(
        ([key]) => key.toLowerCase() === lowerCasedFiatRateKey,
    );

    return caseInsensitiveMatch?.[1]?.rate;
};

export const getEarnPositionFiatAmount = (
    { balance, fiatRateKey, tickerId }: EarnFiatPosition,
    currentFiatRates: RatesByKey | undefined,
): BaseCurrencyAmount | null =>
    isTestnet(tickerId.symbol)
        ? asBaseCurrencyAmount(new BigNumber(0))
        : toFiatCurrency({ amount: balance, rate: currentFiatRates?.[fiatRateKey]?.rate });
