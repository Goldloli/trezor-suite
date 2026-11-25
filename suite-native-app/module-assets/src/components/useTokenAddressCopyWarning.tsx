import { useRef } from 'react';
import { useSelector } from 'react-redux';

import { type AddressType } from '@suite-common/wallet-types';
import { useAlert } from '@suite-native/alerts';
import { Translation, type TxKeyPath } from '@suite-native/intl';
import {
    disableTokenAddressCopyWarning,
    selectHasTokenAddressCopyWarningBeenDisabled,
} from '@suite-native/settings';
import { useServices } from '@trezor/dependency-injection';
import { injectDispatch } from '@trezor/redux-utils';

import { TokenAddressCopyWarningAppendix } from './TokenAddressCopyWarningAppendix';

const descriptionByAddressType: Record<AddressType, TxKeyPath> = {
    contract:
        'moduleAssets.assetDetailScreen.settings.copyAddressWarningAlert.description.contract',
    fingerprint:
        'moduleAssets.assetDetailScreen.settings.copyAddressWarningAlert.description.fingerprint',
    policyId:
        'moduleAssets.assetDetailScreen.settings.copyAddressWarningAlert.description.policyId',
};

type ConfirmTokenAddressCopyParams = {
    addressType: AddressType;
    onConfirm: () => void;
};

export const useTokenAddressCopyWarning = () => {
    const hasWarningBeenDisabled = useSelector(selectHasTokenAddressCopyWarningBeenDisabled);

    // Shares the checkbox state of the alert appendix with the alert's confirm handler.
    const isDoNotShowAgainCheckedRef = useRef(false);

    const { dispatch } = useServices(injectDispatch);
    const { showAlert } = useAlert();

    const confirmTokenAddressCopy = ({ addressType, onConfirm }: ConfirmTokenAddressCopyParams) => {
        if (hasWarningBeenDisabled) {
            onConfirm();

            return;
        }

        isDoNotShowAgainCheckedRef.current = false;

        showAlert({
            title: (
                <Translation id="moduleAssets.assetDetailScreen.settings.copyAddressWarningAlert.title" />
            ),
            description: <Translation id={descriptionByAddressType[addressType]} />,
            pictogramVariant: 'warning',
            appendix: (
                <TokenAddressCopyWarningAppendix
                    onDoNotShowAgainChange={isChecked => {
                        isDoNotShowAgainCheckedRef.current = isChecked;
                    }}
                />
            ),
            primaryButtonTitle: (
                <Translation id="moduleAssets.assetDetailScreen.settings.copyAddressWarningAlert.confirmButton" />
            ),
            primaryButtonColorProps: { intent: 'warning', priority: 'primary' },
            onPressPrimaryButton: () => {
                if (isDoNotShowAgainCheckedRef.current) {
                    dispatch(disableTokenAddressCopyWarning());
                }

                onConfirm();
            },
            secondaryButtonTitle: <Translation id="generic.buttons.cancel" />,
            secondaryButtonColorProps: { intent: 'warning', priority: 'secondary' },
            testID: '@asset-detail/settings/copy-address-warning-alert',
        });
    };

    return confirmTokenAddressCopy;
};
