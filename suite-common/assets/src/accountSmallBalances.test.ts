import { mockStakingState } from '@suite-common/earn-staking/mocks';
import { type TokenAddress } from '@suite-common/tokens';
import { asNetworkSymbol } from '@suite-common/wallet-config';
import { type Account, type AccountKey } from '@suite-common/wallet-types';
import { getFiatRateKey } from '@suite-common/wallet-utils';
import { type TokenInfo } from '@trezor/blockchain-link-types';
import { FirmwareType, type StaticSessionId } from '@trezor/device-utils';

import { selectAccountSmallBalances } from './accountSmallBalances';
import { type HomeAssetTableState } from './homeAssetTableSelectors';

const ALICE = 'aliceWallet@device:0' as StaticSessionId;
const ETH = asNetworkSymbol('eth');
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as TokenAddress;
const ENS = '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72' as TokenAddress;

const mockToken = (contract: TokenAddress, symbol: string, balance: string, decimals: number) =>
    ({ standard: 'ERC20', contract, symbol, balance, decimals }) satisfies TokenInfo;

const account = {
    key: `descriptor0-eth-${ALICE}` as AccountKey,
    deviceState: ALICE,
    symbol: ETH,
    networkType: 'ethereum',
    formattedBalance: '1.2',
    tokens: [mockToken(USDC, 'USDC', '1000', 6), mockToken(ENS, 'ENS', '0.01', 18)],
    visible: true,
} as unknown as Account;

// A current rate carries the dollar rate too; in dollars the two are the same number.
const mockRate = (rate: number, contract?: TokenAddress, usdRate = rate) => ({
    [getFiatRateKey(ETH, 'usd', contract)]: { rate, usdRate },
});

const createState = (rates: Record<string, { rate: number; usdRate: number }>) =>
    ({
        earn: { staking: mockStakingState() },
        device: {
            selectedDevice: {
                state: { staticSessionId: ALICE },
                firmwareType: FirmwareType.Universal,
            },
        },
        wallet: {
            accounts: [account],
            settings: { localCurrency: 'usd', enabledNetworks: [ETH] },
            fiat: { current: rates, lastWeek: {}, historic: {} },
        },
        tokenDefinitions: { [ETH]: { coin: { data: [USDC, ENS], hide: [], show: [] } } },
        networks: { [ETH]: { symbol: ETH, name: 'Ethereum' } },
    }) as unknown as HomeAssetTableState;

describe('the small balances of an account', () => {
    it('are what it holds worth under a dollar, with how many and how much', () => {
        // 0.01 ENS at $20 is 20c; the ether and the USDC are worth far more.
        const state = createState({
            ...mockRate(3000),
            ...mockRate(1, USDC),
            ...mockRate(20, ENS),
        });
        const { keys, summary } = selectAccountSmallBalances(state, account.key);

        expect([...keys]).toEqual([ENS]);
        expect(summary?.assetCount).toBe(1);
        expect(summary?.fiatValue.toFixed()).toBe('0.2');
    });

    it('never count what has no rate, so nothing is hidden by mistake', () => {
        const state = createState({ ...mockRate(3000), ...mockRate(1, USDC) });

        expect(selectAccountSmallBalances(state, account.key)).toEqual({
            keys: new Set(),
            summary: undefined,
        });
    });

    it('are none for an account it does not know', () => {
        const state = createState({ ...mockRate(3000) });

        expect(selectAccountSmallBalances(state, 'unknown' as AccountKey).summary).toBeUndefined();
    });

    it('keep the result across a recreated state', () => {
        const state = createState({ ...mockRate(3000), ...mockRate(20, ENS) });

        expect(selectAccountSmallBalances(state, account.key)).toBe(
            selectAccountSmallBalances(state, account.key),
        );
    });
});
