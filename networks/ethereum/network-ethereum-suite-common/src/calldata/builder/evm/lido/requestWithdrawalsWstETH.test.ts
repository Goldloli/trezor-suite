import { BigNumber } from '@trezor/utils';

import { buildLidoRequestWithdrawalsWstETH } from './requestWithdrawalsWstETH';
import { Calldata } from '../../../calldata';
import { asEvmAddress } from '../../../types/evm';

const OWNER = '0x9eA3721B5Bf3b64b4418c38B603154d2D597FAE3';
const OTHER_ADDRESS = '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';

const context = { sender: asEvmAddress(OWNER) };

describe('buildLidoRequestWithdrawalsWstETH', () => {
    it('encodes one request owned by the sender', () => {
        const result = buildLidoRequestWithdrawalsWstETH(
            { amounts: [new BigNumber('1000000000000000000')], owner: OWNER },
            context,
        );

        expect(result.isValid).toBe(true);
        expect(result.data).toBe(
            [
                '0x19aa6257',
                '0000000000000000000000000000000000000000000000000000000000000040',
                '0000000000000000000000009ea3721b5bf3b64b4418c38b603154d2d597fae3',
                '0000000000000000000000000000000000000000000000000000000000000001',
                '0000000000000000000000000000000000000000000000000de0b6b3a7640000',
            ].join(''),
        );
        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual([]);
    });

    it('decodes encoded calldata back to the amounts and the owner', () => {
        const result = buildLidoRequestWithdrawalsWstETH(
            { amounts: [new BigNumber('5'), new BigNumber('7')], owner: OWNER },
            context,
        );

        expect(Calldata.evm.lido.requestWithdrawalsWstETH.decode(result.data ?? undefined)).toEqual(
            { amounts: [5n, 7n], owner: OWNER.toLowerCase() },
        );
    });

    it('returns an error for an owner other than the sender', () => {
        const result = buildLidoRequestWithdrawalsWstETH(
            { amounts: [new BigNumber('5')], owner: OTHER_ADDRESS },
            context,
        );

        expect(result.isValid).toBe(false);
        expect(result.data).toBe(null);
        expect(result.errors).toEqual([
            { code: 'NOT_SAME_AS_SENDER', path: 'owner', severity: 'error' },
        ]);
    });

    it('returns an error for a zero amount', () => {
        const result = buildLidoRequestWithdrawalsWstETH(
            { amounts: [new BigNumber('5'), new BigNumber('0')], owner: OWNER },
            context,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toEqual([
            { code: 'ZERO_AMOUNT', path: 'amounts[1]', severity: 'error' },
        ]);
    });
});
