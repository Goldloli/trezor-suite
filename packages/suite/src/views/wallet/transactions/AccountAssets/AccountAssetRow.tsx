import { memo } from 'react';

import { events, injectDesktopAnalytics } from '@suite/analytics';
import { Translation } from '@suite/intl';
import { gotoThunk } from '@suite/router';
import { type AccountAssetRow as AccountAssetRowData } from '@suite-common/assets';
import { Badge } from '@trezor/components';
import { useServices } from '@trezor/dependency-injection';
import { injectDispatch } from '@trezor/redux-utils';

import { AssetTableRowView } from '#src/views/home/HomeAssetsTable/AssetTableRowView';

type AccountAssetRowProps = Omit<AccountAssetRowData, 'key'>;

/** A Home asset row with what one account holds: its coin, its stake, or a token. */
export const AccountAssetRow = memo(function AccountAssetRow({
    kind,
    networkSymbol,
    contractAddress,
    tokenSymbol,
    tokenDecimals,
    amount,
}: AccountAssetRowProps) {
    const { analytics, dispatch } = useServices(injectDesktopAnalytics, injectDispatch);
    const isStaking = kind === 'staking';

    // The stake opens the account's Staking; anything else opens the asset.
    const open = () => {
        analytics.report({
            type: events.navigateFlowEvent.name,
            payload: {
                action: 'navigate',
                type: isStaking ? 'earn' : 'asset',
                from: 'account-overview',
                networkSymbol,
            },
        });
        dispatch(
            isStaking
                ? gotoThunk({ routeName: 'wallet-staking', preserveParams: true })
                : gotoThunk({
                      routeName: 'suite-asset',
                      params: { symbol: networkSymbol, contractAddress },
                  }),
        );
    };

    return (
        <AssetTableRowView
            networkSymbol={networkSymbol}
            contractAddress={contractAddress}
            tokenSymbol={tokenSymbol}
            tokenDecimals={tokenDecimals}
            amount={amount}
            badge={
                isStaking ? (
                    <Badge size="small">
                        <Translation id="TR_STAKE_STAKED" />
                    </Badge>
                ) : undefined
            }
            onOpen={open}
            data-testid={`@wallet/account-asset/${networkSymbol}/${isStaking ? 'staking' : (contractAddress ?? 'coin')}`}
        />
    );
});
