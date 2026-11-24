import { memo } from 'react';

import { events, injectDesktopAnalytics } from '@suite/analytics';
import { gotoThunk } from '@suite/router';
import { type TokenAddress, type TokenSymbol } from '@suite-common/tokens';
import { type NetworkSymbol } from '@suite-common/wallet-config';
import { useServices } from '@trezor/dependency-injection';
import { injectDispatch } from '@trezor/redux-utils';

import { AssetTableRowView } from '#src/views/home/HomeAssetsTable/AssetTableRowView';

type AccountAssetRowProps = {
    networkSymbol: NetworkSymbol;
    /** Left out for the account's coin. */
    contractAddress?: TokenAddress;
    tokenSymbol?: TokenSymbol;
    tokenDecimals?: number;
    amount: string;
};

/** A Home asset row with what one account holds of its coin or of a token; it opens the asset. */
export const AccountAssetRow = memo(function AccountAssetRow({
    networkSymbol,
    contractAddress,
    tokenSymbol,
    tokenDecimals,
    amount,
}: AccountAssetRowProps) {
    const { analytics, dispatch } = useServices(injectDesktopAnalytics, injectDispatch);

    const openAsset = () => {
        analytics.report({
            type: events.navigateFlowEvent.name,
            payload: {
                action: 'navigate',
                type: 'asset',
                from: 'account-overview',
                networkSymbol,
            },
        });
        dispatch(
            gotoThunk({
                routeName: 'suite-asset',
                params: { symbol: networkSymbol, contractAddress },
            }),
        );
    };

    return (
        <AssetTableRowView
            networkSymbol={networkSymbol}
            contractAddress={contractAddress}
            tokenSymbol={tokenSymbol ?? null}
            tokenDecimals={tokenDecimals}
            amount={amount}
            onOpen={openAsset}
            data-testid={`@wallet/account-asset/${networkSymbol}/${contractAddress ?? 'coin'}`}
        />
    );
});
