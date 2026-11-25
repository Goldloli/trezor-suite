import '@suite-common/test-utils/globalOverrides';

import { fireEvent, screen, within } from '@testing-library/react';

import { initialState as selectedAccountInitialState } from '@suite/account';
import { type DesktopAnalyticsDep } from '@suite/analytics';
import { mockDesktopAnalytics } from '@suite/analytics/mocks';
import { messages } from '@suite/intl';
import { type SuiteRouterHistoryDep, getRoute } from '@suite/router';
import { mockSuiteRouterHistory } from '@suite/router/mocks';
import { mockNetworkIcon, mockNetworksState } from '@suite-common/networks/mocks';
import { mockSuiteDevice } from '@suite-common/suite-types/mocks';
import { createTestCompositionRoot } from '@suite-common/test-utils';
import { type TokenAddress } from '@suite-common/tokens';
import { asNetworkSymbol } from '@suite-common/wallet-config';
import { type Account, asAccountDescriptor } from '@suite-common/wallet-types';
import { mockAccountToken, mockWalletAccount } from '@suite-common/wallet-types/mocks';
import { type StaticSessionId } from '@trezor/device-utils';

import { renderWithProviders } from '#src/support/test-utils/hooksHelper';

import { AccountHiddenTokens } from './AccountHiddenTokens';
import { type MockSuiteState, mockInitialAppState } from '../../../../../mocks/mockInitialAppState';

global.ResizeObserver = class MockedResizeObserver {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
};

const DEVICE_STATE = '1stTestnetAddress@device_id:0' as StaticSessionId;

const ETH = asNetworkSymbol('eth');

const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as TokenAddress;
/** Known to Trezor, and hidden by the user. */
const ONE_INCH = '0x111111111117dc0aa78b770fa6a738034120c302' as TokenAddress;
/** No token definition vouches for these, so they are hidden as unrecognized. */
const SCAM = '0x00000000000000000000000000000000000000ff' as TokenAddress;
const OTHER_SCAM = '0x00000000000000000000000000000000000000ee' as TokenAddress;

const ethAccount = mockWalletAccount({
    symbol: ETH,
    deviceState: DEVICE_STATE,
    formattedBalance: '1.2',
    tokens: [
        mockAccountToken({ symbol: 'USDC', contract: USDC, balance: '1000', decimals: 6 }),
        mockAccountToken({ symbol: '1INCH', contract: ONE_INCH, balance: '2.1', decimals: 18 }),
        mockAccountToken({ symbol: 'SCAM', contract: SCAM, balance: '5', decimals: 18 }),
    ],
});

/** Another account of the same network, whose hidden token must stay out of the list. */
const otherEthAccount = mockWalletAccount({
    symbol: ETH,
    deviceState: DEVICE_STATE,
    index: 1,
    descriptor: asAccountDescriptor('otherDescriptor'),
    formattedBalance: '10',
    tokens: [mockAccountToken({ symbol: 'OTHER', contract: OTHER_SCAM, balance: '7' })],
});

const getState = (accounts: Account[], hiddenByUser: TokenAddress[]): MockSuiteState => ({
    ...mockInitialAppState,
    networks: mockNetworksState([ETH]),
    device: {
        ...mockInitialAppState.device,
        selectedDevice: mockSuiteDevice({ state: { staticSessionId: DEVICE_STATE } }),
    },
    tokenDefinitions: {
        [ETH]: {
            coin: {
                data: [USDC, ONE_INCH],
                error: false,
                isLoading: false,
                hide: hiddenByUser,
                show: [],
            },
        },
    },
    wallet: {
        ...mockInitialAppState.wallet,
        selectedAccount: selectedAccountInitialState,
        accounts,
        settings: {
            ...mockInitialAppState.wallet.settings,
            enabledNetworks: [ETH],
            localCurrency: 'usd',
        },
    },
});

const renderHiddenTokens = (account: Account, hiddenByUser: TokenAddress[] = [ONE_INCH]) => {
    const suiteRouterHistory = { ...mockSuiteRouterHistory(), navigate: jest.fn() };
    const { services } = createTestCompositionRoot<
        { services: DesktopAnalyticsDep & SuiteRouterHistoryDep },
        MockSuiteState
    >({
        preloadedState: getState(
            [...new Set([ethAccount, otherEthAccount, account])],
            hiddenByUser,
        ),
        services: () => ({ analytics: mockDesktopAnalytics(), suiteRouterHistory }),
    });

    renderWithProviders(
        { ...services, networks: { networkIcon: mockNetworkIcon() } },
        <AccountHiddenTokens accountKey={account.key} />,
    );

    return { suiteRouterHistory };
};

const rowTestIds = (table: HTMLElement) =>
    within(table)
        .getAllByTestId(/^@wallet\/account-asset\//)
        .map(row => row.getAttribute('data-testid'));

describe('the hidden tokens of one account', () => {
    it('lists the tokens the user hid and the unrecognized ones, of this account only', () => {
        renderHiddenTokens(ethAccount);

        const hiddenByUser = screen.getByTestId('@account-hidden-tokens/hidden-by-user');
        const unrecognized = screen.getByTestId('@account-hidden-tokens/unrecognized');

        expect(hiddenByUser).toHaveTextContent(messages.TR_HIDDEN_TOKENS.defaultMessage);
        expect(rowTestIds(hiddenByUser)).toEqual([`@wallet/account-asset/eth/${ONE_INCH}`]);
        expect(unrecognized).toHaveTextContent(
            messages.TR_TOKEN_UNRECOGNIZED_BY_TREZOR.defaultMessage,
        );
        expect(rowTestIds(unrecognized)).toEqual([`@wallet/account-asset/eth/${SCAM}`]);
        expect(
            screen.queryByTestId(`@wallet/account-asset/eth/${OTHER_SCAM}`),
        ).not.toBeInTheDocument();
        expect(screen.queryByTestId(`@wallet/account-asset/eth/${USDC}`)).not.toBeInTheDocument();
    });

    it('shows the amount the account holds of a hidden token', () => {
        renderHiddenTokens(ethAccount);

        expect(screen.getByTestId(`@wallet/account-asset/eth/${ONE_INCH}`)).toHaveTextContent(
            /2\.10* 1INCH/,
        );
    });

    it('leaves out a table with nothing in it', () => {
        renderHiddenTokens(otherEthAccount);

        expect(
            screen.queryByTestId('@account-hidden-tokens/hidden-by-user'),
        ).not.toBeInTheDocument();
        expect(rowTestIds(screen.getByTestId('@account-hidden-tokens/unrecognized'))).toEqual([
            `@wallet/account-asset/eth/${OTHER_SCAM}`,
        ]);
    });

    it('says there are none when the account has no hidden tokens', () => {
        const visibleOnly = mockWalletAccount({
            symbol: ETH,
            deviceState: DEVICE_STATE,
            index: 2,
            descriptor: asAccountDescriptor('visibleOnly'),
            tokens: [mockAccountToken({ symbol: 'USDC', contract: USDC, balance: '1' })],
        });

        renderHiddenTokens(visibleOnly, []);

        expect(screen.getByTestId('@account-hidden-tokens/empty')).toHaveTextContent(
            messages.TR_HIDDEN_TOKENS_EMPTY.defaultMessage,
        );
    });

    it('opens the asset detail of a hidden token', () => {
        const { suiteRouterHistory } = renderHiddenTokens(ethAccount);

        fireEvent.click(screen.getByTestId(`@wallet/account-asset/eth/${ONE_INCH}`));

        expect(suiteRouterHistory.navigate).toHaveBeenCalledWith(
            expect.objectContaining({ pathname: getRoute('suite-asset')?.pattern }),
        );
    });
});
