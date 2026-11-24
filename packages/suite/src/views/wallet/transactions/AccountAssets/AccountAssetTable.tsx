import { useState } from 'react';

import { events, injectDesktopAnalytics } from '@suite/analytics';
import { gotoThunk } from '@suite/router';
import {
    HOME_ASSET_ROW_LIMIT,
    getAccountListSectionKey,
    getHomeAssetRowLimit,
    selectAccountAssetOverview,
    selectAccountSmallBalances,
    selectAreHomeAssetSmallBalancesDisplayed,
} from '@suite-common/assets';
import { setAreHomeAssetSmallBalancesShown } from '@suite-common/wallet-core';
import { type AccountKey } from '@suite-common/wallet-types';
import { Table } from '@trezor/components';
import { useServices } from '@trezor/dependency-injection';
import { injectDispatch } from '@trezor/redux-utils';

import { AssetTableExpandRow } from '#src/components/wallet/assets/AssetTableExpandRow';
import { AssetTableFilterHeader } from '#src/components/wallet/assets/AssetTableFilter';
import { AssetTableFrame } from '#src/components/wallet/assets/AssetTableFrame';
import { AssetTableSmallBalancesHiddenRow } from '#src/components/wallet/assets/AssetTableSmallBalancesHiddenRow';
import { ASSET_TABLE_CELL_PADDING } from '#src/components/wallet/assets/assetTableLayout';
import { useSelector } from '#src/hooks/suite/useSelector';
import { DropdownRow } from '#src/views/wallet/tokens/DropdownRow';

import { AccountAssetSectionRow } from './AccountAssetSectionRow';

type AccountAssetTableProps = {
    accountKey: AccountKey;
};

/**
 * What one account holds, as the mobile account overview lists it: its coin, its stake on a row
 * of its own, its tokens by value, and the tokens it holds none of in a group that opens. The
 * menu is the Home table's, without the grouping: every row is the account's network.
 */
export const AccountAssetTable = ({ accountKey }: AccountAssetTableProps) => {
    const { analytics, dispatch } = useServices(injectDesktopAnalytics, injectDispatch);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isZeroBalanceOpen, setIsZeroBalanceOpen] = useState(false);
    const { heldSections, zeroBalanceSections } = useSelector(state =>
        selectAccountAssetOverview(state, accountKey),
    );
    const smallBalances = useSelector(state => selectAccountSmallBalances(state, accountKey));
    const areSmallBalancesShown = useSelector(selectAreHomeAssetSmallBalancesDisplayed);
    const rows = areSmallBalancesShown
        ? heldSections
        : heldSections.filter(
              section => !smallBalances.keys.has(getAccountListSectionKey(section)),
          );
    const isFoldable = rows.length > HOME_ASSET_ROW_LIMIT;
    const rowLimit = getHomeAssetRowLimit({ isFoldable, isExpanded });
    const shownRows = rowLimit === undefined ? rows : rows.slice(0, rowLimit);

    const changeSmallBalances = (areShown: boolean) => {
        // Turning them on while the table is folded would otherwise change nothing on screen.
        if (areShown) {
            setIsExpanded(true);
        }
        dispatch(setAreHomeAssetSmallBalancesShown(areShown));
    };

    const openHiddenTokens = () => {
        analytics.report({
            type: events.navigateFlowEvent.name,
            payload: { action: 'navigate', type: 'hidden-tokens', from: 'account-overview' },
        });
        dispatch(gotoThunk({ routeName: 'suite-hidden-tokens' }));
    };

    if (heldSections.length === 0 && zeroBalanceSections.length === 0) {
        return null;
    }

    return (
        <AssetTableFrame
            assetHeader={
                <AssetTableFilterHeader
                    areSmallBalancesShown={areSmallBalancesShown}
                    smallBalances={smallBalances.summary}
                    onSmallBalancesChange={changeSmallBalances}
                    onOpenHiddenTokens={openHiddenTokens}
                />
            }
            data-testid="@wallet/account-assets/table"
        >
            {rows.length === 0 && heldSections.length > 0 && (
                <AssetTableSmallBalancesHiddenRow
                    onShowSmallBalances={() => changeSmallBalances(true)}
                />
            )}
            {shownRows.map(section => (
                <AccountAssetSectionRow key={getAccountListSectionKey(section)} section={section} />
            ))}
            {isFoldable && (
                <AssetTableExpandRow
                    isExpanded={isExpanded}
                    onToggle={() => setIsExpanded(!isExpanded)}
                />
            )}
            {zeroBalanceSections.length > 0 && (
                <Table.Row
                    onClick={() => setIsZeroBalanceOpen(!isZeroBalanceOpen)}
                    data-testid="@wallet/account-assets/zero-balance"
                >
                    <Table.Cell colSpan={3} padding={ASSET_TABLE_CELL_PADDING.first}>
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
                zeroBalanceSections.map(section => (
                    <AccountAssetSectionRow
                        key={getAccountListSectionKey(section)}
                        section={section}
                    />
                ))}
        </AssetTableFrame>
    );
};
