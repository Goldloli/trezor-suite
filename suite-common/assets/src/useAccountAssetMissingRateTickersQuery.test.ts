/**
 * @jest-environment jsdom
 */
import { createTestCompositionRoot, renderHookWithStoreProvider } from '@suite-common/test-utils';
import { asNetworkSymbol } from '@suite-common/wallet-config';
import { useMissingRateTickersQuery } from '@suite-common/wallet-core';
import { type Account, type AccountKey } from '@suite-common/wallet-types';
import { type StaticSessionId } from '@trezor/device-utils';

import { type HomeAssetTableState } from './homeAssetTableSelectors';
import { useAccountAssetMissingRateTickersQuery } from './useAccountAssetMissingRateTickersQuery';

// The query fetches rates over the network; here it only reports what it was asked for.
jest.mock('@suite-common/wallet-core', () => ({
    ...jest.requireActual('@suite-common/wallet-core'),
    useMissingRateTickersQuery: jest.fn(),
}));

const mockUseMissingRateTickersQuery = jest.mocked(useMissingRateTickersQuery);

const ALICE = 'aliceWallet@device:0' as StaticSessionId;
const ETH = asNetworkSymbol('eth');

const account = {
    key: `descriptor0-eth-${ALICE}` as AccountKey,
    deviceState: ALICE,
    symbol: ETH,
    networkType: 'ethereum',
    formattedBalance: '1.2',
    tokens: [],
    visible: true,
} as unknown as Account;

const renderQuery = (isFetching: boolean) => {
    mockUseMissingRateTickersQuery.mockReturnValue({ isFetching } as ReturnType<
        typeof useMissingRateTickersQuery
    >);

    const { services } = createTestCompositionRoot<void, HomeAssetTableState>({
        preloadedState: {
            earn: { staking: { positions: {}, products: {} } },
            device: { selectedDevice: { state: { staticSessionId: ALICE } } },
            wallet: {
                accounts: [account],
                settings: { localCurrency: 'usd', enabledNetworks: [ETH] },
                fiat: { current: {}, lastWeek: {}, historic: {} },
            },
            tokenDefinitions: {},
            networks: { [ETH]: { symbol: ETH, name: 'Ethereum' } },
        } as unknown as HomeAssetTableState,
    });

    return renderHookWithStoreProvider(() => useAccountAssetMissingRateTickersQuery(account.key), {
        services,
    });
};

describe('useAccountAssetMissingRateTickersQuery', () => {
    it('asks for the rates the account lacks, in the base currency', () => {
        renderQuery(false);

        expect(mockUseMissingRateTickersQuery).toHaveBeenCalledWith({
            missingRateTickers: [{ symbol: ETH, tokenAddress: undefined }],
            baseCurrencyCode: 'usd',
        });
    });

    it.each([true, false])('is loading while the rates are being fetched: %s', isFetching => {
        const { result } = renderQuery(isFetching);

        expect(result.current).toEqual({ isFiatRatesLoading: isFetching });
    });
});
