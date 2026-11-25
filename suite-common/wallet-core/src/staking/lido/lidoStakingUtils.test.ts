import {
    convertETHToWstETH,
    convertWstETHToETH,
    toLidoWithdrawalRequests,
} from './lidoStakingUtils';

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
