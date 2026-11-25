import { AccountLabel } from '@suite/account';
import { Translation } from '@suite/intl';
import { gotoThunk, selectSettingsBackRoute } from '@suite/router';
import { type Account } from '@suite-common/wallet-types';
import { Column, IconButton, Row, Text } from '@trezor/components';
import { useServices } from '@trezor/dependency-injection';
import { CaretLeftIcon } from '@trezor/icons';
import { TokenIcon } from '@trezor/product-components';
import { injectDispatch } from '@trezor/redux-utils';

import { PageHeader } from '#src/components/suite/layouts/SuiteLayout/PageHeader/PageHeader';
import { useSelector } from '#src/hooks/suite/useSelector';

type LidoStakePageHeaderProps = {
    account?: Account;
};

export const LidoStakePageHeader = ({ account }: LidoStakePageHeaderProps) => {
    const { dispatch } = useServices(injectDispatch);
    const previousRoute = useSelector(selectSettingsBackRoute);

    const onBackClick = () => {
        dispatch(gotoThunk({ routeName: previousRoute.name, params: previousRoute.params }));
    };

    return (
        <PageHeader>
            <Row width="100%" gap={16} alignItems="center">
                <IconButton
                    icon={CaretLeftIcon}
                    intent="neutral"
                    priority="secondary"
                    size="large"
                    onClick={onBackClick}
                    data-testid="@account-subpage/back"
                    tooltip={{ content: <Translation id="TR_BACK" /> }}
                />
                {account ? (
                    <Row alignItems="center" gap={12} overflow="hidden">
                        <TokenIcon networkSymbol={account.symbol} size={32} />
                        <Column gap={2} overflow="hidden">
                            <Text typographyStyle="body-md-strong" ellipsisLineCount={1}>
                                <Translation id="TR_EARN_LIDO_PAGE_TITLE" />
                            </Text>
                            <AccountLabel
                                account={account}
                                showAccountTypeBadge
                                accountTypeBadgeSize="small"
                                intent="neutral"
                                priority="secondary"
                                typographyStyle="body-sm"
                            />
                        </Column>
                    </Row>
                ) : (
                    <Text typographyStyle="body-md-strong">
                        <Translation id="TR_EARN_LIDO_PAGE_TITLE" />
                    </Text>
                )}
            </Row>
        </PageHeader>
    );
};
