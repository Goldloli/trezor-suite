import { type WalletAccountTransaction } from '@suite-common/wallet-types';
import { getLidoDeployment } from '@trezor/network-ethereum-suite-common';
import { asNetworkSymbol } from '@trezor/network-module-types';
import { throwError } from '@trezor/utils';

import {
    buildLidoApproveTransaction,
    buildLidoClaimWithdrawalsTransaction,
    buildLidoRequestWithdrawalsTransaction,
    buildLidoStakeTransaction,
    convertETHToWstETH,
    convertWstETHToETH,
    findPendingLidoTransaction,
    getLidoTransactionKind,
    splitLidoWithdrawalAmount,
    toLidoWithdrawalRequests,
} from './lidoStakingUtils';

const deployment =
    getLidoDeployment(asNetworkSymbol('eth')) ?? throwError('Expected a Lido deployment on eth');

const OWNER = '0x9eA3721B5Bf3b64b4418c38B603154d2D597FAE3';
const ETHER = '000000000000000000';

// One wstETH is worth 1.25 ETH.
const wstETHValue = '1250000000000000000';

describe('convertWstETHToETH', () => {
    it('values wstETH in ETH, rounded down to a whole wei', () => {
        expect(convertWstETHToETH({ wstETHAmount: `2${ETHER}`, wstETHValue })).toBe(
            '2500000000000000000',
        );
        expect(convertWstETHToETH({ wstETHAmount: '1', wstETHValue })).toBe('1');
    });
});

describe('convertETHToWstETH', () => {
    it('values ETH in wstETH, rounded down to a whole wei', () => {
        expect(convertETHToWstETH({ ethAmount: '2500000000000000000', wstETHValue })).toBe(
            `2${ETHER}`,
        );
        expect(convertETHToWstETH({ ethAmount: '1', wstETHValue })).toBe('0');
    });
});

describe('splitLidoWithdrawalAmount', () => {
    it('keeps an amount under the request maximum in one request', () => {
        expect(splitLidoWithdrawalAmount({ wstETHAmount: `2${ETHER}`, wstETHValue })).toEqual([
            `2${ETHER}`,
        ]);
    });

    it('splits a larger amount into requests of at most 999 stETH', () => {
        // 999 stETH is 799.2 wstETH at this value.
        const requests = splitLidoWithdrawalAmount({ wstETHAmount: `2000${ETHER}`, wstETHValue });

        expect(requests).toEqual([
            '799200000000000000000',
            '799200000000000000000',
            '401600000000000000000',
        ]);
    });

    it('requests nothing for no amount', () => {
        expect(splitLidoWithdrawalAmount({ wstETHAmount: '0', wstETHValue })).toEqual([]);
    });
});

describe('buildLidoStakeTransaction', () => {
    it('sends the stake as the transaction value to the referral staker', () => {
        expect(buildLidoStakeTransaction({ deployment, ethAmount: `1${ETHER}` })).toEqual({
            to: deployment.wstETHReferralStaker,
            data: `0x946fe3e8${'0'.repeat(64)}`,
            value: '0xde0b6b3a7640000',
        });
    });

    it('builds nothing for no amount', () => {
        expect(buildLidoStakeTransaction({ deployment, ethAmount: '0' })).toBe(null);
    });
});

describe('buildLidoApproveTransaction', () => {
    it('approves the withdrawal queue to take the wstETH', () => {
        const transaction = buildLidoApproveTransaction({
            deployment,
            owner: OWNER,
            wstETHAmount: `1${ETHER}`,
        });

        expect(transaction).toEqual({
            to: deployment.wstETH,
            data: [
                '0x095ea7b3',
                '000000000000000000000000889edc2edab5f40e902b864ad4d7ade8e412f9b1',
                '0000000000000000000000000000000000000000000000000de0b6b3a7640000',
            ].join(''),
        });
    });
});

describe('buildLidoRequestWithdrawalsTransaction', () => {
    it('requests the withdrawals for the owner at the withdrawal queue', () => {
        const transaction = buildLidoRequestWithdrawalsTransaction({
            deployment,
            owner: OWNER,
            wstETHAmounts: [`1${ETHER}`],
        });

        expect(transaction?.to).toBe(deployment.withdrawalQueue);
        expect(transaction?.data.startsWith('0x19aa6257')).toBe(true);
        expect(transaction?.data).toContain('9ea3721b5bf3b64b4418c38b603154d2d597fae3');
    });

    it('builds nothing without an amount', () => {
        expect(
            buildLidoRequestWithdrawalsTransaction({ deployment, owner: OWNER, wstETHAmounts: [] }),
        ).toBe(null);
    });
});

describe('buildLidoClaimWithdrawalsTransaction', () => {
    it('claims the requests with their hints at the withdrawal queue', () => {
        const transaction = buildLidoClaimWithdrawalsTransaction({
            deployment,
            requestIds: ['5'],
            hints: ['7'],
        });

        expect(transaction?.to).toBe(deployment.withdrawalQueue);
        expect(transaction?.data.startsWith('0xe3afe0a3')).toBe(true);
    });

    it('builds nothing when a request has no hint', () => {
        expect(
            buildLidoClaimWithdrawalsTransaction({
                deployment,
                requestIds: ['5', '6'],
                hints: ['7'],
            }),
        ).toBe(null);
    });
});

describe('toLidoWithdrawalRequests', () => {
    it('lists the requests that are not claimed yet, the oldest first', () => {
        const requests = toLidoWithdrawalRequests({
            requestIds: [9n, 5n, 7n],
            statuses: [
                {
                    amountOfStETH: 3n,
                    amountOfShares: 2n,
                    owner: OWNER,
                    timestamp: 1_700_000_300n,
                    isFinalized: false,
                    isClaimed: false,
                },
                {
                    amountOfStETH: 1n,
                    amountOfShares: 1n,
                    owner: OWNER,
                    timestamp: 1_700_000_100n,
                    isFinalized: true,
                    isClaimed: false,
                },
                {
                    amountOfStETH: 2n,
                    amountOfShares: 1n,
                    owner: OWNER,
                    timestamp: 1_700_000_200n,
                    isFinalized: true,
                    isClaimed: true,
                },
            ],
        });

        expect(requests).toEqual([
            {
                id: '5',
                amountOfStETH: '1',
                requestedAt: 1_700_000_100_000,
                isFinalized: true,
            },
            {
                id: '9',
                amountOfStETH: '3',
                requestedAt: 1_700_000_300_000,
                isFinalized: false,
            },
        ]);
    });
});

describe('getLidoTransactionKind', () => {
    const stake = buildLidoStakeTransaction({ deployment, ethAmount: `1${ETHER}` });
    const approve = buildLidoApproveTransaction({
        deployment,
        owner: OWNER,
        wstETHAmount: `1${ETHER}`,
    });
    const request = buildLidoRequestWithdrawalsTransaction({
        deployment,
        owner: OWNER,
        wstETHAmounts: [`1${ETHER}`],
    });
    const claim = buildLidoClaimWithdrawalsTransaction({
        deployment,
        requestIds: ['5'],
        hints: ['1'],
    });

    it.each([
        ['stake', stake],
        ['approve', approve],
        ['request-withdrawal', request],
        ['claim', claim],
    ] as const)('recognizes the %s call on its own contract', (kind, transaction) => {
        expect(
            getLidoTransactionKind({ deployment, to: transaction?.to, data: transaction?.data }),
        ).toBe(kind);
    });

    it('takes the target in any letter case', () => {
        expect(
            getLidoTransactionKind({
                deployment,
                to: stake?.to.toUpperCase().replace('0X', '0x'),
                data: stake?.data,
            }),
        ).toBe('stake');
    });

    it('recognizes no Lido call sent to another contract', () => {
        expect(getLidoTransactionKind({ deployment, to: OWNER, data: claim?.data })).toBe(null);
        expect(
            getLidoTransactionKind({ deployment, to: deployment.wstETH, data: request?.data }),
        ).toBe(null);
    });

    it('recognizes no approval of wstETH for another spender', () => {
        const approvalOfAnotherSpender = buildLidoApproveTransaction({
            deployment: { ...deployment, withdrawalQueue: deployment.stETH },
            owner: OWNER,
            wstETHAmount: `1${ETHER}`,
        });

        expect(
            getLidoTransactionKind({
                deployment,
                to: deployment.wstETH,
                data: approvalOfAnotherSpender?.data,
            }),
        ).toBe(null);
    });

    it('recognizes nothing without a target or calldata', () => {
        expect(getLidoTransactionKind({ deployment, to: undefined, data: stake?.data })).toBe(null);
        expect(getLidoTransactionKind({ deployment, to: stake?.to, data: undefined })).toBe(null);
    });
});

describe('findPendingLidoTransaction', () => {
    const request =
        buildLidoRequestWithdrawalsTransaction({
            deployment,
            owner: OWNER,
            wstETHAmounts: [`1${ETHER}`],
        }) ?? throwError('Expected a withdrawal request transaction');

    type TransactionOverrides = {
        txid: string;
        blockHeight?: number;
        signer?: string;
        to?: string;
        data?: string;
        isTokenTransfer?: boolean;
    };

    const createTransaction = ({
        txid,
        blockHeight,
        signer = OWNER,
        to = request.to,
        data = request.data,
        isTokenTransfer = false,
    }: TransactionOverrides) =>
        ({
            txid,
            symbol: 'eth',
            type: 'sent',
            blockHeight,
            descriptor: OWNER,
            details: {
                vin: [{ n: 0, isAddress: true, addresses: [signer] }],
                vout: [{ n: 0, isAddress: true, addresses: [to] }],
            },
            targets: isTokenTransfer ? [] : [{ addresses: [to] }],
            internalTransfers: [],
            ethereumSpecific: { nonce: 1, data, status: -1 },
        }) as unknown as WalletAccountTransaction;

    const find = (transactions: WalletAccountTransaction[]) =>
        findPendingLidoTransaction({ deployment, transactions, kind: 'request-withdrawal' })?.txid;

    it('finds the withdrawal request that is still to be mined', () => {
        expect(find([createTransaction({ txid: 'mined', blockHeight: 100 })])).toBe(undefined);
        expect(
            find([
                createTransaction({ txid: 'mined', blockHeight: 100 }),
                createTransaction({ txid: 'pending' }),
            ]),
        ).toBe('pending');
    });

    it('finds a pending request the app recorded as a token transfer', () => {
        expect(find([createTransaction({ txid: 'pending', isTokenTransfer: true })])).toBe(
            'pending',
        );
    });

    it('skips a pending transaction of another kind, target or signer', () => {
        const stake = buildLidoStakeTransaction({ deployment, ethAmount: `1${ETHER}` });

        expect(
            find([
                createTransaction({ txid: 'stake', to: stake?.to, data: stake?.data }),
                createTransaction({ txid: 'other-target', to: deployment.stETH }),
                createTransaction({ txid: 'other-signer', signer: deployment.stETH }),
            ]),
        ).toBe(undefined);
    });
});
