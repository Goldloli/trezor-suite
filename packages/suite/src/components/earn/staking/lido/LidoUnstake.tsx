import { useState } from 'react';

import { Translation } from '@suite/intl';
import { useRefreshStakingProductInfo } from '@suite-common/earn-staking';
import { type Account } from '@suite-common/wallet-types';
import { SelectBar, Text } from '@trezor/components';

import { LidoUnstakeQueue } from './LidoUnstakeQueue';
import { LidoUnstakeSwap } from './LidoUnstakeSwap';

type LidoExit = 'queue' | 'swap';

type LidoUnstakeProps = {
    account: Account;
};

export const LidoUnstake = ({ account }: LidoUnstakeProps) => {
    useRefreshStakingProductInfo();

    const [exit, setExit] = useState<LidoExit>('queue');
    const [isComplete, setIsComplete] = useState(false);

    return (
        <>
            {!isComplete && (
                <>
                    <Text typographyStyle="headline-md" data-testid="@staking/lido-unstake/title">
                        <Translation id="TR_STAKE_UNSTAKE" />
                    </Text>

                    <SelectBar
                        isFullWidth
                        selectedOption={exit}
                        onChange={setExit}
                        options={[
                            {
                                label: <Translation id="TR_EARN_LIDO_UNSTAKE_QUEUE_OPTION" />,
                                value: 'queue',
                            },
                            {
                                label: <Translation id="TR_EARN_LIDO_UNSTAKE_SWAP_OPTION" />,
                                value: 'swap',
                            },
                        ]}
                        data-testid="@staking/lido-unstake/exit-select"
                    />
                </>
            )}

            {exit === 'queue' ? (
                <LidoUnstakeQueue account={account} onCompleteChange={setIsComplete} />
            ) : (
                <LidoUnstakeSwap account={account} />
            )}
        </>
    );
};
