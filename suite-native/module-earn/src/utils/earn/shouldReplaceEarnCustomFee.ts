import { type FeeLevelLabel } from '@suite-common/wallet-types';
import { BigNumber } from '@trezor/utils';

export const shouldReplaceEarnCustomFee = (
    selectedFee: FeeLevelLabel | undefined,
    customGasLimit: string | undefined,
    estimatedGasLimit: string | undefined,
) =>
    selectedFee === 'custom' &&
    !!customGasLimit &&
    !!estimatedGasLimit &&
    new BigNumber(customGasLimit).lt(estimatedGasLimit);
