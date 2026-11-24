import { Translation } from '@suite/intl';
import { type NetworkSymbol } from '@suite-common/wallet-config';
import { Badge } from '@trezor/components';

import { AssetTableRowView } from '#src/components/wallet/assets/AssetTableRowView';
import { useOpenAccountStaking } from '#src/components/wallet/assets/useOpenAccountStaking';

type AccountStakingRowProps = {
    networkSymbol: NetworkSymbol;
    amount: string;
};

/** A Home asset row with what one account stakes of its coin; it opens the account's Staking. */
export const AccountStakingRow = ({ networkSymbol, amount }: AccountStakingRowProps) => {
    const openAccountStaking = useOpenAccountStaking('account-overview');

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
            onOpen={() => openAccountStaking(networkSymbol)}
            data-testid={`@wallet/account-asset/${networkSymbol}/staking`}
        />
    );
};
