import { type ReactNode } from 'react';

import { Translation } from '@suite/intl';
import { Card, Table } from '@trezor/components';

import {
    HOME_ASSET_CELL_PADDING,
    HOME_ASSET_COL_WIDTHS,
} from '#src/views/home/HomeAssetsTable/homeAssetTableLayout';

type AssetTableFrameProps = {
    /** What heads the asset column: its label, and the table's menu where it has one. */
    assetHeader: ReactNode;
    /** Shown inside the card, above the table. */
    banner?: ReactNode;
    /** The table's rows. */
    children: ReactNode;
    'data-testid': string;
};

/** The card, the columns and the header row every asset table shares; the rows are its children. */
export const AssetTableFrame = ({
    assetHeader,
    banner,
    children,
    'data-testid': dataTestId,
}: AssetTableFrameProps) => (
    <Card paddingType="none" data-testid={dataTestId}>
        {banner}
        <Table isRowHighlightedOnHover colWidths={HOME_ASSET_COL_WIDTHS}>
            <Table.Header>
                <Table.Row>
                    <Table.Cell padding={HOME_ASSET_CELL_PADDING.first}>{assetHeader}</Table.Cell>
                    <Table.Cell align="end">
                        <Translation id="TR_EXCHANGE_RATE" />
                    </Table.Cell>
                    <Table.Cell align="end" padding={HOME_ASSET_CELL_PADDING.last}>
                        <Translation id="TR_BALANCE" />
                    </Table.Cell>
                </Table.Row>
            </Table.Header>
            <Table.Body>{children}</Table.Body>
        </Table>
    </Card>
);
