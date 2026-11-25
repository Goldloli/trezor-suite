import { type ReactNode } from 'react';

import { Translation } from '@suite/intl';
import { type Account } from '@suite-common/wallet-types';
import { Button, Card, Column, IconCircle, Text } from '@trezor/components';
import { CheckIcon } from '@trezor/icons';

import { useNavigateToLidoRoute } from './useNavigateToLidoRoute';

type LidoFlowCompleteProps = {
    account: Account;
    heading: ReactNode;
    description: ReactNode;
    children?: ReactNode;
};

export const LidoFlowComplete = ({
    account,
    heading,
    description,
    children,
}: LidoFlowCompleteProps) => {
    const navigateToLidoRoute = useNavigateToLidoRoute(account);

    return (
        <Column gap={16} data-testid="@staking/lido/complete">
            <IconCircle icon={CheckIcon} intent="brand" size={96} />

            <Column gap={4}>
                <Text typographyStyle="headline-md">{heading}</Text>
                <Text intent="neutral" priority="secondary">
                    {description}
                </Text>
            </Column>

            {children !== undefined && (
                <Card type="contrast" paddingType="none">
                    {children}
                </Card>
            )}

            <Button
                intent="neutral"
                priority="secondary"
                onClick={() => navigateToLidoRoute('wallet-staking')}
            >
                <Translation id="TR_EARN_LIDO_BACK_TO_STAKING" />
            </Button>
        </Column>
    );
};
