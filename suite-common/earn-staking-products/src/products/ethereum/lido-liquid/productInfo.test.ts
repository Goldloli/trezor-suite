import { mock } from '@trezor/dependency-injection';
import { getLidoDeployment } from '@trezor/network-ethereum-suite-common';
import { asNetworkSymbol } from '@trezor/network-module-types';
import { err, ok } from '@trezor/type-utils';
import { throwError } from '@trezor/utils';

import {
    type EthereumLidoLiquidProductInfoDeps,
    fetchEthereumLidoLiquidProductInfo,
} from './productInfo';

type BlockchainEvmRpcCall = ReturnType<
    EthereumLidoLiquidProductInfoDeps['getTrezorConnect']
>['blockchainEvmRpcCall'];

type Fetch = EthereumLidoLiquidProductInfoDeps['fetch'];

const eth = asNetworkSymbol('eth');
const deployment = getLidoDeployment(eth) ?? throwError('Expected a Lido deployment on eth');

const DAY_MS = 24 * 60 * 60 * 1000;

// StEthPerToken of 1.25 ETH.
const STETH_PER_TOKEN_RESULT = `0x${'1158e460913d0000'.padStart(64, '0')}`;

const APR_URL = 'https://eth-api.lido.fi/v1/protocol/steth/apr/sma';
const WITHDRAWAL_TIME_URL = 'https://wq-api.lido.fi/v2/request-time/calculate';

const aprResponse = { data: { aprs: [], smaApr: 2.45 }, meta: { symbol: 'stETH' } };
const withdrawalTimeResponse = {
    requestInfo: { finalizationIn: 4 * DAY_MS, type: 'validatorBalances' },
    status: 'calculated',
};

type CreateDepsParams = {
    responses?: Record<string, Response>;
    blockchainEvmRpcCall?: BlockchainEvmRpcCall;
};

const createDeps = ({
    responses = {},
    blockchainEvmRpcCall = () => Promise.resolve(ok({ data: STETH_PER_TOKEN_RESULT })),
}: CreateDepsParams = {}) => {
    const mockBlockchainEvmRpcCall = mock<BlockchainEvmRpcCall>(blockchainEvmRpcCall);

    const mockFetch = mock<Fetch>(url => {
        const response = {
            [APR_URL]: Response.json(aprResponse),
            [WITHDRAWAL_TIME_URL]: Response.json(withdrawalTimeResponse),
            ...responses,
        }[url];

        return response === undefined
            ? Promise.reject(new Error('Unexpected request'))
            : Promise.resolve(response);
    });

    const deps: EthereumLidoLiquidProductInfoDeps = {
        fetch: mockFetch,
        getTrezorConnect: () => ({ blockchainEvmRpcCall: mockBlockchainEvmRpcCall }),
    };

    return { deps, mockBlockchainEvmRpcCall, mockFetch };
};

describe('fetchEthereumLidoLiquidProductInfo', () => {
    it('maps the APR, the queue time and the wstETH value onto the product info', async () => {
        const { deps } = createDeps();

        await expect(
            fetchEthereumLidoLiquidProductInfo(deps, { networkSymbol: eth, deployment }),
        ).resolves.toEqual({
            rate: 2.45,
            entryPeriodDays: 0,
            exitPeriodDays: 4,
            rewardPeriodDays: 1,
            nextRewardAt: null,
            liquidTokenValue: '1250000000000000000',
            targets: [],
        });
    });

    it('asks the wstETH contract of the network for its value', async () => {
        const { deps, mockBlockchainEvmRpcCall } = createDeps();

        await fetchEthereumLidoLiquidProductInfo(deps, { networkSymbol: eth, deployment });

        expect(mockBlockchainEvmRpcCall).toHaveBeenCalledWith(
            expect.objectContaining({ coin: 'eth', to: deployment.wstETH, data: '0x035faf82' }),
        );
    });

    it('passes the abort signal to the Lido API requests', async () => {
        const { deps, mockFetch } = createDeps();
        const abortSignal = new AbortController().signal;

        await fetchEthereumLidoLiquidProductInfo(deps, {
            networkSymbol: eth,
            deployment,
            abortSignal,
        });

        expect(mockFetch).toHaveBeenCalledWith(APR_URL, { signal: abortSignal });
        expect(mockFetch).toHaveBeenCalledWith(WITHDRAWAL_TIME_URL, { signal: abortSignal });
    });

    it.each([
        ['an error status', new Response(null, { status: 503 })],
        ['an unexpected body', Response.json({ status: 'calculating' })],
    ])('leaves the queue time unknown when the Lido API answers with %s', async (_, response) => {
        const { deps } = createDeps({ responses: { [WITHDRAWAL_TIME_URL]: response } });

        await expect(
            fetchEthereumLidoLiquidProductInfo(deps, { networkSymbol: eth, deployment }),
        ).resolves.toMatchObject({
            rate: 2.45,
            exitPeriodDays: null,
            liquidTokenValue: '1250000000000000000',
        });
    });

    it.each([
        ['an error status', new Response(null, { status: 503 })],
        ['an unexpected body', Response.json({ data: {} })],
    ])('leaves the rate unknown when the Lido API answers with %s', async (_, response) => {
        const { deps } = createDeps({ responses: { [APR_URL]: response } });

        await expect(
            fetchEthereumLidoLiquidProductInfo(deps, { networkSymbol: eth, deployment }),
        ).resolves.toMatchObject({
            rate: null,
            exitPeriodDays: 4,
            liquidTokenValue: '1250000000000000000',
        });
    });

    it('fails without the wstETH value, which the position cannot do without', async () => {
        const { deps } = createDeps({
            blockchainEvmRpcCall: () =>
                Promise.resolve(err({ message: 'execution reverted', code: 'Backend_Error' })),
        });

        await expect(
            fetchEthereumLidoLiquidProductInfo(deps, { networkSymbol: eth, deployment }),
        ).rejects.toThrow('Reading the wstETH value failed');
    });
});
