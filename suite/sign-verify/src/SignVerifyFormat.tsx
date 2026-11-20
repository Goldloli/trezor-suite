import { type ReactNode, use } from 'react';

import { Translation } from '@suite/intl';
import { Box, Row, SelectBar, Text, Tooltip } from '@trezor/components';
import { throwError } from '@trezor/utils';

import { SignVerifyContext, SignVerifyFormContext } from './SignVerifyContext';

const FORMAT_SWITCH_WIDTH = 360;

type SignVerifyFormatOption = {
    value: string;
    label: ReactNode;
};

type SignVerifyFormatProps = {
    options: SignVerifyFormatOption[];
    tooltip?: ReactNode;
};

export const SignVerifyFormat = ({ options, tooltip }: SignVerifyFormatProps) => {
    const { outcome } = use(SignVerifyContext) ?? throwError('Missing SignVerify');
    const { values, update } = use(SignVerifyFormContext) ?? throwError('Missing SignVerify form');

    const label = (
        <Text case="capitalize" intent="neutral" priority="secondary" typographyStyle="body-md">
            <Translation id="TR_FORMAT" />
        </Text>
    );

    return (
        <Row gap={12}>
            {tooltip ? (
                <Tooltip maxWidth={330} content={tooltip} hasIcon>
                    {label}
                </Tooltip>
            ) : (
                label
            )}
            <Box width={FORMAT_SWITCH_WIDTH}>
                <SelectBar
                    isFullWidth
                    isDisabled={outcome !== 'idle'}
                    options={options}
                    selectedOption={values.format}
                    onChange={format => update({ format })}
                    data-testid="@sign-verify/format"
                />
            </Box>
        </Row>
    );
};
