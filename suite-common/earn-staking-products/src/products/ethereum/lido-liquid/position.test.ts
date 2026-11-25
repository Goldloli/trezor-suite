import {
    type StakingAccount,
    type StakingPosition,
    stakingAmountSchema,
    stakingPositionSchema,
} from '@suite-common/earn-staking-common';
import {
    mockStakingAccount,
    mockStakingProductInfo,
    mockStakingTransaction,
} from '@suite-common/earn-staking-common/mocks';
import { getLidoDeployment } from '@trezor/network-ethereum-suite-common';
import { asNetworkSymbol } from '@trezor/network-module-types';
import { throwError } from '@trezor/utils';

import { createEthereumLidoLiquidProductDescriptor } from './descriptor';
import { getEthereumLidoLiquidProductPosition } from './position';
import { lidoProvider } from '../../../providers/lido';

const eth = asNetworkSymbol('eth');
const deployment = getLidoDeployment(eth) ?? throwError('Expected a Lido deployment on eth');
const descriptor = createEthereumLidoLiquidProductDescriptor({ networkSymbol: eth });

const WSTETH_CONTRACT = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0';

const amount = (value: string) => stakingAmountSchema.parse(value);

// One wstETH is worth 1.25 ETH.
const productInfo = mockStakingProductInfo({
    liquidTokenValue: amount('1250000000000000000'),
    targets: [],
});

// The app account carries token balances in whole tokens.
const accountWithWstETH = (balance: string): StakingAccount =>
    mockStakingAccount({
        tokens: [
            {
                standard: 'ERC20',
                contract: WSTETH_CONTRACT,
                symbol: 'wstETH',
                decimals: 18,
                balance,
            },
        ],
    });

const pendingTransaction = (methodId: string) =>
    mockStakingTransaction({
        txid: `${methodId}-pending`,
        blockHeight: undefined,
        ethereumSpecific: {
            status: -1,
            nonce: 6,
            gasLimit: 300_000,
            gasPrice: '1',
            parsedData: { methodId, name: '' },
        },
    });

const getPosition = (
    params: Partial<Parameters<typeof getEthereumLidoLiquidProductPosition>[0]> = {},
) =>
    getEthereumLidoLiquidProductPosition({
        productId: descriptor.id,
        deployment,
        account: accountWithWstETH('2'),
        productInfo,
        transactions: [],
        ...params,
    });

describe('getEthereumLidoLiquidProductPosition', () => {
    it('values the wstETH balance in ETH as the stake', () => {
        const position = getPosition();

        const expected: StakingPosition = {
            productId: descriptor.id,
            status: 'active',
            lockup: 'liquid',
            balances: {
                staked: amount('2500000000000000000'),
                pending: amount('0'),
                unstaking: amount('0'),
                withdrawable: amount('0'),
                rewards: amount('0'),
            },
            activations: [],
            unlocks: [],
            targets: [
                {
                    address: deployment.wstETH,
                    providerId: lidoProvider.id,
                    name: 'Lido',
                    amount: amount('2500000000000000000'),
                },
            ],
            operations: ['stake', 'unstake'],
            pendingTransactions: [],
            warnings: [],
            details: {
                kind: 'liquid-token',
                contract: deployment.wstETH,
                balance: amount('2000000000000000000'),
            },
            revalidateAt: null,
        };

        expect(position).toEqual(expected);
        expect(stakingPositionSchema.safeParse(position).success).toBe(true);
    });

    it('rounds the stake down to a whole wei', () => {
        const position = getPosition({
            account: accountWithWstETH('0.000000000000000001'),
            productInfo: mockStakingProductInfo({
                liquidTokenValue: amount('1250047056393720171'),
                targets: [],
            }),
        });

        expect(position?.balances.staked).toBe('1');
        expect(position?.details).toMatchObject({ balance: '1' });
    });

    it('has no position for an account without wstETH', () => {
        expect(getPosition({ account: mockStakingAccount() })).toBe(null);
        expect(getPosition({ account: accountWithWstETH('0') })).toBe(null);
    });

    it('has no position until the wstETH value is known', () => {
        expect(getPosition({ productInfo: null })).toBe(null);
        expect(getPosition({ productInfo: mockStakingProductInfo({ targets: [] }) })).toBe(null);
    });

    it('is activating while the first stake is pending', () => {
        const position = getPosition({
            account: mockStakingAccount(),
            transactions: [pendingTransaction('0x946fe3e8')],
        });

        expect(position).toMatchObject({
            status: 'activating',
            operations: ['stake'],
            pendingTransactions: [{ txid: '0x946fe3e8-pending', operation: 'stake' }],
            targets: [],
        });
    });

    it('withholds the unstake while a withdrawal request is pending', () => {
        const position = getPosition({ transactions: [pendingTransaction('0x19aa6257')] });

        expect(position).toMatchObject({
            operations: ['stake'],
            pendingTransactions: [{ txid: '0x19aa6257-pending', operation: 'unstake' }],
        });
    });

    it('reads a pending claim as a withdraw', () => {
        const position = getPosition({ transactions: [pendingTransaction('0xe3afe0a3')] });

        expect(position?.pendingTransactions).toEqual([
            { txid: '0xe3afe0a3-pending', operation: 'withdraw' },
        ]);
    });
});
