import { memo } from 'react';

import { events, injectDesktopAnalytics } from '@suite/analytics';
import { Translation } from '@suite/intl';
import { gotoThunk } from '@suite/router';
import { type NetworkSymbol } from '@suite-common/wallet-config';
import { Badge } from '@trezor/components';
import { useServices } from '@trezor/dependency-injection';
import { injectDispatch } from '@trezor/redux-utils';

import { AssetTableRowView } from '#src/views/home/HomeAssetsTable/AssetTableRowView';

type AccountStakingRowProps = {
    networkSymbol: NetworkSymbol;
    amount: string;
};

/** A Home asset row with what one account stakes of its coin; it opens the account's Staking. */
export const AccountStakingRow = memo(function AccountStakingRow({
    networkSymbol,
    amount,
}: AccountStakingRowProps) {
    const { analytics, dispatch } = useServices(injectDesktopAnalytics, injectDispatch);

    const openStaking = () => {
        analytics.report({
            type: events.navigateFlowEvent.name,
            payload: {
                action: 'navigate',
                type: 'earn',
                from: 'account-overview',
                networkSymbol,
            },
        });
        dispatch(gotoThunk({ routeName: 'wallet-staking', preserveParams: true }));
    };

    return (
        <AssetTableRowView
            networkSymbol={networkSymbol}
            contractAddress={undefined}
            tokenSymbol={null}
            tokenDecimals={undefined}
            amount={amount}
            badge={
                <Badge size="small">
                    <Translation id="TR_STAKE_STAKED" />
                </Badge>
            }
            onOpen={openStaking}
            data-testid={`@wallet/account-asset/${networkSymbol}/staking`}
        />
    );
});
