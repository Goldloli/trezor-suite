import { LidoContractReads } from './lidoContractReads';

const word = (hex: string) => hex.padStart(64, '0');

// Results of mainnet calls for the first two requests of the queue.
const WITHDRAWAL_STATUS_RESULT = `0x${[
    word('20'),
    word('2'),
    word('5543df729c0000'),
    word('4bd8e6c732fdf1'),
    word('0a24f077377f2d555d6dcc7caef68b3568fbac1d'),
    word('64624caf'),
    word('1'),
    word('0'),
    word('10f2c'),
    word('f138'),
    word('516fca170bfe24bfc54e01f215ef85fe9b5b798a'),
    word('64624cbb'),
    word('1'),
    word('1'),
].join('')}`;

const UINT256_ARRAY_RESULT = `0x${[word('20'), word('2'), word('1'), word('1')].join('')}`;

describe('LidoContractReads', () => {
    it('encodes the calls without arguments as their selector', () => {
        expect(LidoContractReads.stEthPerToken.encode()).toBe('0x035faf82');
        expect(LidoContractReads.getCurrentStakeLimit.encode()).toBe('0x609c4c6c');
        expect(LidoContractReads.getLastCheckpointIndex.encode()).toBe('0x526eae3e');
    });

    it('decodes a single value', () => {
        expect(LidoContractReads.stEthPerToken.decode(`0x${word('11590f2cbcded16b')}`)).toBe(
            1_250_047_056_393_720_171n,
        );
    });

    it('encodes the owner of the withdrawal requests', () => {
        expect(
            LidoContractReads.getWithdrawalRequests.encode({
                owner: '0x0a24f077377F2d555D6Dcc7cAEF68b3568fbac1D',
            }),
        ).toBe(`0x7d031b65${word('0a24f077377f2d555d6dcc7caef68b3568fbac1d')}`);
    });

    it('decodes the withdrawal request ids', () => {
        expect(LidoContractReads.getWithdrawalRequests.decode(UINT256_ARRAY_RESULT)).toEqual([
            1n,
            1n,
        ]);
    });

    it('encodes the request ids whose status is read', () => {
        expect(LidoContractReads.getWithdrawalStatus.encode({ requestIds: [1n, 2n] })).toBe(
            `0xb8c4b85a${[word('20'), word('2'), word('1'), word('2')].join('')}`,
        );
    });

    it('decodes the status of each withdrawal request', () => {
        expect(LidoContractReads.getWithdrawalStatus.decode(WITHDRAWAL_STATUS_RESULT)).toEqual([
            {
                amountOfStETH: 24_000_000_000_000_000n,
                amountOfShares: 21_349_108_949_384_689n,
                owner: '0x0a24f077377F2d555D6Dcc7cAEF68b3568fbac1D',
                timestamp: 1_684_163_759n,
                isFinalized: true,
                isClaimed: false,
            },
            {
                amountOfStETH: 69_420n,
                amountOfShares: 61_752n,
                owner: '0x516fCA170bfE24BFC54e01F215EF85Fe9B5B798A',
                timestamp: 1_684_163_771n,
                isFinalized: true,
                isClaimed: true,
            },
        ]);
    });

    it('searches the checkpoint hints from the first checkpoint to the last', () => {
        expect(
            LidoContractReads.findCheckpointHints.encode({
                requestIds: [1n, 2n],
                lastCheckpointIndex: 5n,
            }),
        ).toBe(
            `0x62abe3fa${[word('60'), word('1'), word('5'), word('2'), word('1'), word('2')].join('')}`,
        );
    });

    it('rejects a result that is not hex encoded', () => {
        expect(() => LidoContractReads.stEthPerToken.decode('execution reverted')).toThrow(
            'Expected a hex encoded call result',
        );
    });
});
