import { Translation } from '@suite/intl';
import { type NetworkSymbol } from '@suite-common/wallet-config';
import { type AccountKey } from '@suite-common/wallet-types';
import { isApyAvailable } from '@suite-common/wallet-utils';
import { Badge, Row } from '@trezor/components';

import { YieldBadge } from '#src/components/earn/YieldBadge/YieldBadge';
import { AssetTableRowView } from '#src/components/wallet/assets/AssetTableRowView';
import { useOpenAccountStaking } from '#src/components/wallet/assets/useOpenAccountStaking';
import { useStakingRate } from '#src/hooks/earn/useStakingRate';

type AccountStakingRowProps = {
    accountKey: AccountKey;
    networkSymbol: NetworkSymbol;
    amount: string;
};

/**
 * A Home asset row with what one account stakes of its coin, and the rate the stake earns, as the
 * mobile staking row has it; it opens the account's Staking.
 */
export const AccountStakingRow = ({
    accountKey,
    networkSymbol,
    amount,
}: AccountStakingRowProps) => {
    const openAccountStaking = useOpenAccountStaking({ from: 'account-overview' });
    const { rate: apy } = useStakingRate({ symbol: networkSymbol, accountKey });

    return (
        <AssetTableRowView
            networkSymbol={networkSymbol}
            contractAddress={undefined}
            tokenSymbol={null}
            tokenDecimals={undefined}
            amount={amount}
            badge={
                <Row gap={8} alignItems="center">
                    <Badge size="small">
                        <Translation id="TR_STAKE_STAKED" />
                    </Badge>
                    {apy != null && isApyAvailable(apy) && (
                        <YieldBadge apy={apy} variant="active" />
                    )}
                </Row>
            }
            onOpen={() => openAccountStaking(networkSymbol)}
            data-testid={`@wallet/account-asset/${networkSymbol}/staking`}
        />
    );
};
