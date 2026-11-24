import { useState } from 'react';

import { events, injectDesktopAnalytics } from '@suite/analytics';
import { Translation } from '@suite/intl';
import { gotoThunk } from '@suite/router';
import {
    type AccountListSection,
    HOME_ASSET_ROW_LIMIT,
    getHomeAssetRowLimit,
    selectAccountListSectionsWithVaultTokens,
} from '@suite-common/assets';
import { type TokenInfoBranded } from '@suite-common/tokens';
import { type Account, type AccountKey } from '@suite-common/wallet-types';
import { isPositiveBalance } from '@suite-common/wallet-utils';
import { Card, Row, Table, TextButton } from '@trezor/components';
import { useServices } from '@trezor/dependency-injection';
import { CaretRightIcon } from '@trezor/icons';
import { injectDispatch } from '@trezor/redux-utils';

import { useSelector } from '#src/hooks/suite/useSelector';
import { HomeAssetExpandRow } from '#src/views/home/HomeAssetsTable/HomeAssetExpandRow';
import {
    HOME_ASSET_CELL_PADDING,
    HOME_ASSET_COL_WIDTHS,
} from '#src/views/home/HomeAssetsTable/homeAssetTableLayout';
import { DropdownRow } from '#src/views/wallet/tokens/DropdownRow';

import { AccountAssetRow } from './AccountAssetRow';
import { AccountStakingRow } from './AccountStakingRow';

const renderTokenRow = (account: Account, token: TokenInfoBranded) => (
    <AccountAssetRow
        key={token.contract}
        networkSymbol={account.symbol}
        contractAddress={token.contract}
        tokenSymbol={token.symbol}
        tokenDecimals={token.decimals}
        amount={token.balance ?? '0'}
    />
);

/** The row of a section that holds something; the tokens held at zero are a group, not a row. */
const renderHeldRow = (section: AccountListSection) => {
    switch (section.type) {
        case 'account':
            return (
                <AccountAssetRow
                    key="coin"
                    networkSymbol={section.account.symbol}
                    amount={section.account.formattedBalance}
                />
            );
        case 'staking':
            return (
                <AccountStakingRow
                    key="staking"
                    networkSymbol={section.account.symbol}
                    amount={section.stakingCryptoBalance}
                />
            );
        case 'token':
            return renderTokenRow(section.account, section.token);
        default:
            return null;
    }
};

/** A coin or a stake of nothing is not listed; a token row always holds something. */
const isHeld = (section: AccountListSection) =>
    (section.type === 'account' && isPositiveBalance(section.account.formattedBalance)) ||
    (section.type === 'staking' && isPositiveBalance(section.stakingCryptoBalance)) ||
    section.type === 'token';

type AccountAssetTableProps = {
    accountKey: AccountKey;
};

/**
 * What one account holds, as the mobile account overview lists it: its coin, its stake on a row
 * of its own, its tokens by value, and the tokens it holds none of in a group that opens.
 */
export const AccountAssetTable = ({ accountKey }: AccountAssetTableProps) => {
    const { analytics, dispatch } = useServices(injectDesktopAnalytics, injectDispatch);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isZeroBalanceOpen, setIsZeroBalanceOpen] = useState(false);
    const sections = useSelector(state =>
        selectAccountListSectionsWithVaultTokens(state, accountKey),
    );
    const rows = sections.filter(isHeld);
    const zeroBalanceSection = sections.find(section => section.type === 'zeroBalance');
    const zeroBalanceTokens =
        zeroBalanceSection?.type === 'zeroBalance' ? zeroBalanceSection.tokens : [];
    const isFoldable = rows.length > HOME_ASSET_ROW_LIMIT;
    const rowLimit = getHomeAssetRowLimit({ isFoldable, isExpanded });
    const shownRows = rowLimit === undefined ? rows : rows.slice(0, rowLimit);

    const openHiddenTokens = () => {
        analytics.report({
            type: events.navigateFlowEvent.name,
            payload: { action: 'navigate', type: 'hidden-tokens', from: 'account-overview' },
        });
        dispatch(gotoThunk({ routeName: 'suite-hidden-tokens' }));
    };

    if (rows.length === 0 && zeroBalanceTokens.length === 0) {
        return null;
    }

    return (
        <Card paddingType="none" data-testid="@wallet/account-assets/table">
            <Table isRowHighlightedOnHover colWidths={HOME_ASSET_COL_WIDTHS}>
                <Table.Header>
                    <Table.Row>
                        <Table.Cell padding={HOME_ASSET_CELL_PADDING.first}>
                            <Row gap={12} alignItems="center">
                                <Translation id="TR_ASSET" />
                                <TextButton
                                    size="small"
                                    iconRight={CaretRightIcon}
                                    onClick={openHiddenTokens}
                                    data-testid="@wallet/account-assets/hidden-tokens"
                                >
                                    <Translation id="TR_HIDDEN_TOKENS" />
                                </TextButton>
                            </Row>
                        </Table.Cell>
                        <Table.Cell align="end">
                            <Translation id="TR_EXCHANGE_RATE" />
                        </Table.Cell>
                        <Table.Cell align="end" padding={HOME_ASSET_CELL_PADDING.last}>
                            <Translation id="TR_BALANCE" />
                        </Table.Cell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {shownRows.map(renderHeldRow)}
                    {isFoldable && (
                        <HomeAssetExpandRow
                            isExpanded={isExpanded}
                            onToggle={() => setIsExpanded(!isExpanded)}
                        />
                    )}
                    {zeroBalanceSection !== undefined && zeroBalanceTokens.length > 0 && (
                        <Table.Row
                            onClick={() => setIsZeroBalanceOpen(!isZeroBalanceOpen)}
                            data-testid="@wallet/account-assets/zero-balance"
                        >
                            <Table.Cell colSpan={3} padding={HOME_ASSET_CELL_PADDING.first}>
                                <DropdownRow
                                    isActive={isZeroBalanceOpen}
                                    text="ZERO_BALANCE_TOKENS"
                                    typographyStyle="body-sm"
                                    intent="neutral"
                                    priority="secondary"
                                />
                            </Table.Cell>
                        </Table.Row>
                    )}
                    {isZeroBalanceOpen &&
                        zeroBalanceSection !== undefined &&
                        zeroBalanceTokens.map(token =>
                            renderTokenRow(zeroBalanceSection.account, token),
                        )}
                </Table.Body>
            </Table>
        </Card>
    );
};
