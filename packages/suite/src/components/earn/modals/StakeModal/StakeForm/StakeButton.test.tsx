import { type PropsWithChildren } from 'react';

import { fireEvent, render } from '@testing-library/react';

import { type DesktopAnalyticsDep } from '@suite/analytics';
import { mockDesktopAnalytics } from '@suite/analytics/mocks';
import { MODAL_CONTEXT_NONE } from '@suite/modal';
import { EarnFlow } from '@suite-common/suite-types/src/staking';
import { asNetworkSymbol, getNetwork } from '@suite-common/wallet-config';
import { mockWalletAccount } from '@suite-common/wallet-types/mocks';
import { ServicesProvider } from '@trezor/dependency-injection';

import { StakeButton } from './StakeButton';

const mockReport = jest.fn();
const mockSubmit = jest.fn();
let mockHasFee = true;
let mockDevice = { connected: true, available: true };

jest.mock('@suite/device', () => ({
    ...jest.requireActual('@suite/device'),
    useDevice: () => ({ device: mockDevice, isLocked: () => false }),
}));
jest.mock('@suite/intl', () => ({ Translation: () => null }));
jest.mock('@trezor/components', () => ({
    Tooltip: ({ children }: PropsWithChildren) => children,
    Modal: {
        Button: ({ onClick, isDisabled }: { onClick: () => void; isDisabled: boolean }) => (
            <button onClick={onClick} disabled={isDisabled}>
                Submit
            </button>
        ),
    },
}));
jest.mock('#src/hooks/suite/useSelector', () => ({
    useSelector: (selector: (state: object) => unknown) =>
        selector({ modal: { context: MODAL_CONTEXT_NONE } }),
}));
jest.mock('@suite-common/wallet-core', () => ({
    ...jest.requireActual('@suite-common/wallet-core'),
    selectHasRunningDiscovery: () => false,
    selectAreFeesLoading: () => false,
    selectVotingDelegationOption: () => ({ type: 'abstain' }),
}));
jest.mock('#src/hooks/suite/useMessageSystemStaking', () => ({
    useMessageSystemStaking: () => ({ isStakingDisabled: false }),
}));
jest.mock('#src/hooks/earn/useStakeForm', () => ({
    useStakeFormContext: () => ({
        account: mockWalletAccount({ symbol: asNetworkSymbol('eth') }),
        network: getNetwork(asNetworkSymbol('eth')),
        selectedFee: 'normal',
        composedLevels: mockHasFee ? { normal: { type: 'final' } } : undefined,
        onSubmit: mockSubmit,
        handleSubmit: (callback: () => void) => callback,
        formState: { errors: {}, isSubmitting: false },
        watch: () => '1',
        currency: 'crypto',
    }),
}));

describe('StakeButton device connection analytics', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockHasFee = true;
    });

    it.each([true, false])(
        'allows recovery of a missing composition only when disconnected (connected=%s)',
        connected => {
            mockDevice = { connected, available: connected };
            mockHasFee = false;
            const { getByRole } = render(
                <ServicesProvider services={{ analytics: mockDesktopAnalytics(mockReport) }}>
                    <StakeButton flow={EarnFlow.Stake} />
                </ServicesProvider>,
            );
            fireEvent.click(getByRole('button'));
            expect(mockSubmit).toHaveBeenCalledTimes(connected ? 0 : 1);
        },
    );

    it.each([
        { connected: true, available: true, expectedStatus: 'connected' },
        { connected: false, available: false, expectedStatus: 'disconnected' },
        { connected: true, available: false, expectedStatus: 'unavailable' },
    ])('continues to the terms and reports the device status ($connected/$available)', device => {
        mockDevice = device;
        const services: DesktopAnalyticsDep = {
            analytics: mockDesktopAnalytics(mockReport),
        };
        const { getByRole } = render(
            <ServicesProvider services={services}>
                <StakeButton flow={EarnFlow.Stake} />
            </ServicesProvider>,
        );

        expect(mockReport).not.toHaveBeenCalled();
        fireEvent.click(getByRole('button'));

        expect(mockReport).toHaveBeenCalledTimes(1);
        expect(mockReport).toHaveBeenCalledWith({
            type: 'staking/stake',
            payload: {
                action: 'continue',
                step: 'stake-form-modal',
                currency: 'crypto',
                networkSymbol: 'eth',
                deviceStatus: device.expectedStatus,
            },
        });
        expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
});
