import { useState } from 'react';

import { CheckBox, HStack, PressableOpacity, Text } from '@suite-native/atoms';
import { Translation } from '@suite-native/intl';

type TokenAddressCopyWarningAppendixProps = {
    onDoNotShowAgainChange: (isChecked: boolean) => void;
};

export const TokenAddressCopyWarningAppendix = ({
    onDoNotShowAgainChange,
}: TokenAddressCopyWarningAppendixProps) => {
    const [isChecked, setIsChecked] = useState(false);

    const toggleIsChecked = () => {
        setIsChecked(!isChecked);
        onDoNotShowAgainChange(!isChecked);
    };

    return (
        <PressableOpacity onPress={toggleIsChecked}>
            <HStack spacing="sp12" alignItems="center">
                <CheckBox
                    isChecked={isChecked}
                    onChange={toggleIsChecked}
                    testID="@asset-detail/settings/copy-address-warning-alert/do-not-show-again"
                />
                <Text variant="body-sm" color="contentSecondary">
                    <Translation id="moduleAssets.assetDetailScreen.settings.copyAddressWarningAlert.doNotShowAgain" />
                </Text>
            </HStack>
        </PressableOpacity>
    );
};
