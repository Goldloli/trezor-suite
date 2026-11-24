import { mockStakingState } from '@suite-common/earn-staking/mocks';
import {
    type StakingPosition,
    type StakingPositionBalances,
    stakingAmountSchema,
} from '@suite-common/earn-staking-common';
import {
    mockStakingPosition,
    mockStakingProductDescriptor,
} from '@suite-common/earn-staking-common/mocks';
import { type TokenAddress } from '@suite-common/tokens';
import { asNetworkSymbol } from '@suite-common/wallet-config';
import { type Account, type AccountKey } from '@suite-common/wallet-types';
import { getFiatRateKey } from '@suite-common/wallet-utils';
import { type TokenInfo } from '@trezor/blockchain-link-types';
import { FirmwareType, type StaticSessionId } from '@trezor/device-utils';

import {
    type AccountAssetsRootState,
    selectAccountAssetCount,
    selectAccountAssetMissingRateTickerIds,
    selectAccountAssetRows,
    selectAccountAssetTotalFiatValue,
    selectAccountAvailableAmount,
    selectAccountStakingAmount,
    selectAccountStakingRatio,
    selectAccountZeroBalanceAssetRows,
    selectIsAccountAssetFiatTotalIncomplete,
    selectIsAccountAssetFiatTotalUnavailable,
} from './accountAssetSelectors';

const ALICE = 'aliceWallet@device:0' as StaticSessionId;

const ETH = asNetworkSymbol('eth');
const ADA = asNetworkSymbol('ada');
const TSEP = asNetworkSymbol('tsep');

const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as TokenAddress;
const ENS = '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72' as TokenAddress;
const HIDDEN = '0x00000000000000000000000000000000000000aa' as TokenAddress;

const mockToken = (contract: TokenAddress, symbol: string, balance: string, decimals: number) =>
    ({ standard: 'ERC20', contract, symbol, balance, decimals }) satisfies TokenInfo;

const mockAccount = (overrides: Partial<Account> = {}): Account =>
    ({
        key: `descriptor0-eth-${ALICE}` as AccountKey,
        deviceState: ALICE,
        symbol: ETH,
        networkType: 'ethereum',
        formattedBalance: '1.2',
        tokens: [],
        visible: true,
        ...overrides,
    }) as Account;

const ETH_STAKING_PRODUCT = mockStakingProductDescriptor();
const ADA_STAKING_PRODUCT = mockStakingProductDescriptor({
    networkSymbol: ADA,
    type: 'native',
    operations: ['stake', 'unstake', 'claim', 'vote'],
    rewardsKind: 'claimable',
});

const amount = (value: string) => stakingAmountSchema.parse(value);

const balances = (overrides: Partial<StakingPositionBalances>): StakingPositionBalances => ({
    staked: amount('0'),
    pending: amount('0'),
    unstaking: amount('0'),
    withdrawable: amount('0'),
    rewards: amount('0'),
    ...overrides,
});

const HALF_ETH_STAKED = mockStakingPosition({
    balances: balances({ staked: amount('500000000000000000') }),
});

// A current rate carries the dollar rate too; in dollars the two are the same number.
const mockRate = (rate: number, contract?: TokenAddress) => ({
    [getFiatRateKey(ETH, 'usd', contract)]: { rate, usdRate: rate },
});

type CreateStateOptions = {
    rates?: Record<
        string,
        { rate?: number; usdRate?: number; error?: string | null; isLoading?: boolean }
    >;
    areSmallBalancesShown?: boolean;
    localCurrency?: 'usd' | 'eur';
    stakingPositions?: Partial<Record<AccountKey, readonly StakingPosition[]>>;
    /** Tokens the user chose to show although no definition vouches for them. */
    shownTokens?: TokenAddress[];
};

const createState = (
    accounts: Account[],
    {
        rates = {},
        areSmallBalancesShown = true,
        localCurrency = 'usd',
        stakingPositions = {},
        shownTokens = [],
    }: CreateStateOptions = {},
) =>
    ({
        earn: {
            staking: mockStakingState({
                descriptors: [ETH_STAKING_PRODUCT, ADA_STAKING_PRODUCT],
                positions: stakingPositions,
            }),
        },
        device: {
            selectedDevice: {
                state: { staticSessionId: ALICE },
                firmwareType: FirmwareType.Universal,
            },
        },
        wallet: {
            accounts,
            settings: {
                localCurrency,
                enabledNetworks: [ETH, ADA],
                areHomeAssetSmallBalancesShown: areSmallBalancesShown,
            },
            fiat: { current: rates, lastWeek: {}, historic: {} },
        },
        tokenDefinitions: {
            [ETH]: { coin: { data: [USDC, ENS, HIDDEN], hide: [HIDDEN], show: shownTokens } },
        },
        networks: {
            [ETH]: { symbol: ETH, name: 'Ethereum' },
            [ADA]: { symbol: ADA, name: 'Cardano' },
            [TSEP]: { symbol: TSEP, name: 'Sepolia' },
        },
    }) as unknown as AccountAssetsRootState;

const rowsOf = (state: AccountAssetsRootState, account: Account) =>
    selectAccountAssetRows(state, account.key).map(row => [
        row.kind === 'token' ? row.tokenSymbol : row.kind,
        row.amount,
    ]);

const totalOf = (state: AccountAssetsRootState, account: Account) =>
    selectAccountAssetTotalFiatValue(state, account.key);

describe('the assets of an account', () => {
    const account = mockAccount({
        tokens: [mockToken(ENS, 'ENS', '1.12', 18), mockToken(USDC, 'USDC', '1000', 6)],
    });
    const rates = { ...mockRate(3000), ...mockRate(1, USDC), ...mockRate(20, ENS) };

    it('lists its coin, its stake on a row of its own, and its tokens by value', () => {
        const state = createState([account], {
            rates,
            stakingPositions: { [account.key]: [HALF_ETH_STAKED] },
        });

        expect(rowsOf(state, account)).toEqual([
            ['coin', '1.2'],
            ['staking', '0.5'],
            ['USDC', '1000'],
            ['ENS', '1.12'],
        ]);
        expect(selectAccountAssetCount(state, account.key)).toBe(3);
    });

    it('keys its rows so each can be told from the others', () => {
        const state = createState([account], {
            rates,
            stakingPositions: { [account.key]: [HALF_ETH_STAKED] },
        });

        expect(selectAccountAssetRows(state, account.key).map(row => row.key)).toEqual([
            'coin',
            'staking',
            USDC,
            ENS,
        ]);
    });

    it('leaves out a hidden token and a coin it holds none of', () => {
        const holder = mockAccount({
            formattedBalance: '0',
            tokens: [mockToken(USDC, 'USDC', '5', 6), mockToken(HIDDEN, 'SCAM', '9', 18)],
        });

        expect(rowsOf(createState([holder], { rates }), holder)).toEqual([['USDC', '5']]);
    });

    it('lists only what this account holds, not another account on the same network', () => {
        const other = mockAccount({
            key: `descriptor1-eth-${ALICE}` as AccountKey,
            formattedBalance: '10',
            tokens: [mockToken(USDC, 'USDC', '7', 6)],
        });
        const state = createState([account, other], { rates });

        expect(rowsOf(state, other)).toEqual([
            ['coin', '10'],
            ['USDC', '7'],
        ]);
        expect(totalOf(state, other)).toBe('30007');
    });

    it('keeps the tokens it knows but holds none of in a group of their own', () => {
        const holder = mockAccount({
            tokens: [mockToken(USDC, 'USDC', '5', 6), mockToken(ENS, 'ENS', '0', 18)],
        });
        const state = createState([holder], { rates });

        expect(rowsOf(state, holder)).toEqual([
            ['coin', '1.2'],
            ['USDC', '5'],
        ]);
        expect(
            selectAccountZeroBalanceAssetRows(state, holder.key).map(row => row.tokenSymbol),
        ).toEqual(['ENS']);
    });

    it('lists a vault token among the tokens, where mobile keeps it in its DeFi tab', () => {
        const holder = mockAccount({
            tokens: [{ ...mockToken(USDC, 'USDC', '5', 6), protocols: ['erc4626'] }],
        });

        expect(rowsOf(createState([holder], { rates }), holder)).toEqual([
            ['coin', '1.2'],
            ['USDC', '5'],
        ]);
    });

    it('holds nothing to list once the account is empty or unknown', () => {
        const empty = mockAccount({ formattedBalance: '0' });
        const state = createState([empty], { rates });

        expect(rowsOf(state, empty)).toEqual([]);
        expect(totalOf(state, empty)).toBe('0');
        expect(selectAccountAssetRows(state, 'unknown' as AccountKey)).toEqual([]);
    });

    it('keeps the rows across a recreated state', () => {
        const state = createState([account], { rates });

        expect(selectAccountAssetRows(state, account.key)).toBe(
            selectAccountAssetRows(state, account.key),
        );
    });
});

describe('the staked share of the coin of an account', () => {
    const splitOf = (state: AccountAssetsRootState, account: Account) => ({
        availableAmount: selectAccountAvailableAmount(state, account.key),
        stakingAmount: selectAccountStakingAmount(state, account.key),
        stakingRatio: selectAccountStakingRatio(state, account.key),
    });

    it('splits the coin into what is staked and what is not', () => {
        const account = mockAccount();
        const state = createState([account], {
            stakingPositions: { [account.key]: [HALF_ETH_STAKED] },
        });

        expect(splitOf(state, account)).toEqual({
            availableAmount: '1.2',
            stakingAmount: '0.5',
            stakingRatio: 0.5 / 1.7,
        });
    });

    it('counts only the stake of this account, not of another on the same network', () => {
        const account = mockAccount();
        const other = mockAccount({ key: `descriptor1-eth-${ALICE}` as AccountKey });
        const state = createState([account, other], {
            stakingPositions: { [other.key]: [HALF_ETH_STAKED] },
        });

        expect(splitOf(state, account).stakingAmount).toBe('0');
        expect(splitOf(state, other).stakingAmount).toBe('0.5');
    });
});

describe('the fiat total of an account', () => {
    const account = mockAccount({
        tokens: [mockToken(USDC, 'USDC', '1000', 6), mockToken(ENS, 'ENS', '1.12', 18)],
    });
    const SHOWN_UNKNOWN = '0x00000000000000000000000000000000000000bb' as TokenAddress;
    const flagsOf = (
        state: AccountAssetsRootState,
        ofAccount: Account,
        isFiatRatesLoading = false,
    ) => ({
        missing: selectAccountAssetMissingRateTickerIds(state, ofAccount.key),
        isIncomplete: selectIsAccountAssetFiatTotalIncomplete(
            state,
            ofAccount.key,
            isFiatRatesLoading,
        ),
        isUnavailable: selectIsAccountAssetFiatTotalUnavailable(
            state,
            ofAccount.key,
            isFiatRatesLoading,
        ),
    });

    it('adds up every priced asset, and misses nothing when all of them are', () => {
        const state = createState([account], {
            rates: { ...mockRate(3000), ...mockRate(1, USDC), ...mockRate(20, ENS) },
        });

        expect(totalOf(state, account)).toBe('4622.4');
        expect(flagsOf(state, account)).toEqual({
            missing: [],
            isIncomplete: false,
            isUnavailable: false,
        });
    });

    it('counts the stake into the coin once, though the stake has a row of its own', () => {
        const state = createState([account], {
            rates: { ...mockRate(3000), ...mockRate(1, USDC), ...mockRate(20, ENS) },
            stakingPositions: { [account.key]: [HALF_ETH_STAKED] },
        });

        // 1.2 ETH held and 0.5 ETH staked at $3,000, 1,000 USDC and 1.12 ENS at $20.
        expect(totalOf(state, account)).toBe('6122.4');
    });

    it('adds up what it can, and asks for the rate of a held asset that has none', () => {
        const state = createState([account], {
            rates: { ...mockRate(1, USDC), ...mockRate(20, ENS) },
        });

        expect(totalOf(state, account)).toBe('1022.4');
        expect(flagsOf(state, account)).toEqual({
            missing: [{ symbol: ETH, tokenAddress: undefined }],
            isIncomplete: true,
            isUnavailable: false,
        });
    });

    it('does not call a total incomplete while the rate it lacks is on its way', () => {
        const state = createState([account], {
            rates: { ...mockRate(1, USDC), ...mockRate(20, ENS) },
        });

        expect(flagsOf(state, account, true)).toMatchObject({
            isIncomplete: false,
            isUnavailable: false,
        });
    });

    it('does not miss an empty coin, whatever its rate', () => {
        const empty = mockAccount({
            formattedBalance: '0',
            tokens: [mockToken(USDC, 'USDC', '5', 6)],
        });
        const state = createState([empty], { rates: mockRate(1, USDC) });

        expect(flagsOf(state, empty)).toEqual({
            missing: [],
            isIncomplete: false,
            isUnavailable: false,
        });
    });

    it('has no total while nothing is priced, and is unavailable only once nothing is on its way', () => {
        const state = createState([account]);

        expect(totalOf(state, account)).toBeUndefined();
        expect(flagsOf(state, account, true).isUnavailable).toBe(false);
        expect(flagsOf(state, account).isUnavailable).toBe(true);
        expect(flagsOf(state, account).missing).toEqual([
            { symbol: ETH, tokenAddress: undefined },
            { symbol: ETH, tokenAddress: USDC },
            { symbol: ETH, tokenAddress: ENS },
        ]);
    });

    it('never asks for the rate of a testnet, which is not priced', () => {
        const testnet = mockAccount({
            key: `descriptor0-tsep-${ALICE}` as AccountKey,
            symbol: TSEP,
            formattedBalance: '2',
        });

        expect(flagsOf(createState([testnet]), testnet)).toEqual({
            missing: [],
            isIncomplete: true,
            isUnavailable: true,
        });
    });

    it('never asks for the rate of a token whose rate is not fetched', () => {
        const holder = mockAccount({
            formattedBalance: '0',
            tokens: [mockToken(SHOWN_UNKNOWN, 'UNKNOWN', '5', 6)],
        });
        const state = createState([holder], { shownTokens: [SHOWN_UNKNOWN] });

        expect(rowsOf(state, holder)).toEqual([['UNKNOWN', '5']]);
        expect(flagsOf(state, holder).missing).toEqual([]);
    });

    it('keeps the missing tickers across a recreated state', () => {
        const state = createState([account], {
            rates: { ...mockRate(1, USDC), ...mockRate(20, ENS) },
        });

        expect(selectAccountAssetMissingRateTickerIds(state, account.key)).toBe(
            selectAccountAssetMissingRateTickerIds(state, account.key),
        );
    });
});
