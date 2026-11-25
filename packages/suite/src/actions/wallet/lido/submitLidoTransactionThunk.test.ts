import { mockGetAccountSyncInterval } from '@suite-common/networks/mocks';
import { createTestCompositionRoot } from '@suite-common/test-utils';
import { asNetworkSymbol } from '@suite-common/wallet-config';
import {
    type ComposeYieldEvmTransactionThunkState,
    type LidoTransactionKind,
    type YieldFlowDisplayToken,
} from '@suite-common/wallet-core';
import { type Account } from '@suite-common/wallet-types';
import { mockWalletAccount } from '@suite-common/wallet-types/mocks';
import { mockAnalytics } from '@trezor/analytics-uploader/mocks';
import { asGetter } from '@trezor/dependency-injection';

import { submitLidoTransactionThunk } from './submitLidoTransactionThunk';
import {
    type SendYieldTransactionDeps,
    type SendYieldTransactionState,
} from '../stablecoin-yield/signingHelpers';

const mockComposeYieldEvmTransactionThunk = jest.fn();
const mockOpenDeferredModal = jest.fn();
const mockSendYieldTransaction = jest.fn();

type SubmitLidoTransactionThunkState = ComposeYieldEvmTransactionThunkState &
    SendYieldTransactionState;

jest.mock('@suite-common/wallet-core', () => ({
    ...jest.requireActual('@suite-common/wallet-core'),
    composeYieldEvmTransactionThunk: (payload: unknown) =>
        mockComposeYieldEvmTransactionThunk(payload),
}));

jest.mock('@suite/modal', () => ({
    openDeferredModal: (payload: unknown) => mockOpenDeferredModal(payload),
}));

jest.mock('../stablecoin-yield/signingHelpers', () => ({
    ...jest.requireActual('../stablecoin-yield/signingHelpers'),
    sendYieldTransaction: (payload: unknown) => mockSendYieldTransaction(payload),
}));

const ethSymbol = asNetworkSymbol('eth');
const account = mockWalletAccount({ symbol: ethSymbol }) as Account;

const token: YieldFlowDisplayToken = {
    networkSymbol: ethSymbol,
    symbol: 'wstETH',
    decimals: 18,
    contractAddress: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
};

const transaction = { to: '0x889edc2edab5f40e902b864ad4d7ade8e412f9b1', data: '0x' };

const buildStore = () =>
    createTestCompositionRoot<SendYieldTransactionDeps, SubmitLidoTransactionThunkState>({
        preloadedState: {},
        services: () => ({
            analytics: mockAnalytics(),
            networks: { getAccountSyncInterval: mockGetAccountSyncInterval() },
            getIsWindowVisible: asGetter(() => true),
            getTradedAccountKeys: asGetter(() => []),
        }),
    }).services.store;

const submit = (kind: LidoTransactionKind) =>
    buildStore()
        .dispatch(submitLidoTransactionThunk({ account, kind, transaction, amount: '1.5', token }))
        .unwrap();

describe('submitLidoTransactionThunk', () => {
    beforeEach(() => {
        mockComposeYieldEvmTransactionThunk.mockImplementation(() => () => ({
            unwrap: () => Promise.resolve({ type: 'success', unsignedTransaction: '0xunsigned' }),
        }));
        mockOpenDeferredModal.mockImplementation(
            () => () =>
                Promise.resolve({
                    value: true,
                    resolve: jest.fn(),
                    selectedFee: null,
                    selectedFeeLevel: 'normal',
                }),
        );
        mockSendYieldTransaction.mockResolvedValue({ status: 'sent', txid: 'txid', fee: '1' });
    });

    it.each(['stake', 'request-withdrawal'] as const)(
        'reviews the amount a %s sends',
        async kind => {
            await expect(submit(kind)).resolves.toEqual({ txid: 'txid', fee: '1' });

            expect(mockSendYieldTransaction).toHaveBeenCalledWith(
                expect.objectContaining({ amount: '1.5', token, flowKey: `lido-${kind}` }),
            );
        },
    );

    it.each(['approve', 'claim'] as const)(
        'reviews no sent amount for a %s, which moves nothing out of the account',
        async kind => {
            await submit(kind);

            expect(mockSendYieldTransaction).toHaveBeenCalledWith(
                expect.objectContaining({ amount: '0', token }),
            );
        },
    );

    it('resolves with nothing when the fee modal is dismissed', async () => {
        mockOpenDeferredModal.mockImplementation(() => () => Promise.resolve({ value: false }));
        mockSendYieldTransaction.mockClear();

        await expect(submit('claim')).resolves.toBe(undefined);

        expect(mockSendYieldTransaction).not.toHaveBeenCalled();
    });
});
