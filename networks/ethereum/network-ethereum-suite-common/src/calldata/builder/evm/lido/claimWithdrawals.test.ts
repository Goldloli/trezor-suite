import { BigNumber } from '@trezor/utils';

import { buildLidoClaimWithdrawals } from './claimWithdrawals';
import { Calldata } from '../../../calldata';

describe('buildLidoClaimWithdrawals', () => {
    it('encodes the request ids with their checkpoint hints', () => {
        const result = buildLidoClaimWithdrawals({
            requestIds: [new BigNumber('5')],
            hints: [new BigNumber('7')],
        });

        expect(result.isValid).toBe(true);
        expect(result.data).toBe(
            [
                '0xe3afe0a3',
                '0000000000000000000000000000000000000000000000000000000000000040',
                '0000000000000000000000000000000000000000000000000000000000000080',
                '0000000000000000000000000000000000000000000000000000000000000001',
                '0000000000000000000000000000000000000000000000000000000000000005',
                '0000000000000000000000000000000000000000000000000000000000000001',
                '0000000000000000000000000000000000000000000000000000000000000007',
            ].join(''),
        );
        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual([]);
    });

    it('decodes encoded calldata back to the request ids and the hints', () => {
        const result = buildLidoClaimWithdrawals({
            requestIds: [new BigNumber('5'), new BigNumber('9')],
            hints: [new BigNumber('7'), new BigNumber('8')],
        });

        expect(Calldata.evm.lido.claimWithdrawals.decode(result.data ?? undefined)).toEqual({
            requestIds: [5n, 9n],
            hints: [7n, 8n],
        });
    });

    it('returns an error when a request has no hint', () => {
        const result = buildLidoClaimWithdrawals({
            requestIds: [new BigNumber('5'), new BigNumber('9')],
            hints: [new BigNumber('7')],
        });

        expect(result.isValid).toBe(false);
        expect(result.data).toBe(null);
        expect(result.errors).toEqual([
            expect.objectContaining({ code: 'ARRAYS_LENGTH_MISMATCH', severity: 'error' }),
        ]);
    });
});
