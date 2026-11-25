import { buildLidoStakeETH } from './stakeETH';
import { Calldata } from '../../../calldata';

const REFERRAL = '0x9eA3721B5Bf3b64b4418c38B603154d2D597FAE3';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('buildLidoStakeETH', () => {
    it('encodes the referral address', () => {
        const result = buildLidoStakeETH({ referral: REFERRAL });

        expect(result.isValid).toBe(true);
        expect(result.data).toBe(
            '0x946fe3e80000000000000000000000009ea3721b5bf3b64b4418c38b603154d2d597fae3',
        );
        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual([]);
    });

    it('accepts the zero address as a stake without a referral', () => {
        const result = buildLidoStakeETH({ referral: ZERO_ADDRESS });

        expect(result.isValid).toBe(true);
        expect(result.data).toBe(
            '0x946fe3e80000000000000000000000000000000000000000000000000000000000000000',
        );
        expect(result.warnings).toEqual([]);
    });

    it('decodes encoded calldata back to the referral', () => {
        const result = buildLidoStakeETH({ referral: REFERRAL });

        expect(Calldata.evm.lido.stakeETH.decode(result.data ?? undefined)).toEqual({
            referral: REFERRAL.toLowerCase(),
        });
    });

    it('returns an error for an invalid referral address', () => {
        const result = buildLidoStakeETH({ referral: '0x1234' });

        expect(result.isValid).toBe(false);
        expect(result.data).toBe(null);
        expect(result.errors).toEqual([
            { code: 'INVALID_ADDRESS', path: 'referral', severity: 'error' },
        ]);
    });
});
