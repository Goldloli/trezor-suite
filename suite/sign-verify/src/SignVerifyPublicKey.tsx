import { use } from 'react';

import { useTranslation } from '@suite/intl';
import { Input } from '@trezor/components';
import { throwError } from '@trezor/utils';

import { SignVerifyContext, SignVerifyFormContext } from './SignVerifyContext';
import { SignVerifyCopyButton } from './SignVerifyCopyButton';

export const SignVerifyPublicKey = () => {
    const { outcome } = use(SignVerifyContext) ?? throwError('Missing SignVerify');
    const { values } = use(SignVerifyFormContext) ?? throwError('Missing SignVerify form');

    const { translationString } = useTranslation();

    return (
        <Input
            label={translationString('TR_PUBLIC_KEY')}
            type="text"
            readOnly
            isDisabled={values.pubKey === ''}
            placeholder={translationString('TR_SIGNATURE_AFTER_SIGNING_PLACEHOLDER')}
            value={values.pubKey}
            rightContent={
                outcome === 'signed' ? (
                    <SignVerifyCopyButton
                        value={values.pubKey}
                        data-testid="@sign-verify/copy-pubkey"
                    />
                ) : undefined
            }
            data-testid="@sign-verify/pubKey"
        />
    );
};
