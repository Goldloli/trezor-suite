import { type MouseEvent } from 'react';

import { Translation } from '@suite/intl';
import { selectStakingProductDescriptor } from '@suite-common/earn-staking';
import { useFormatters } from '@suite-common/formatters';
import { calculateRewards } from '@suite-common/wallet-core';
import { type Account } from '@suite-common/wallet-types';
import { Button, Card, Column, Icon, Row, Table } from '@trezor/components';
import { ArrowDownIcon, ArrowRightIcon } from '@trezor/icons';
import { BigNumber } from '@trezor/utils';

import { useLayoutSize } from '#src/hooks/suite/useLayoutSize';
import { useSelector } from '#src/hooks/suite/useSelector';

import { EarnStakingCurrentRewards } from './EarnStakingCurrentRewards';
import { EarnStakingPotentialRewards } from './EarnStakingPotentialRewards';
import { EarnStakingRateTooltip } from './EarnStakingRateTooltip';
import { getEarnStakingPotentialRewards } from './getEarnStakingPotentialRewards';
import { useLidoStaking } from '../../staking/lido/useLidoStaking';
import { useNavigateToLidoRoute } from '../../staking/lido/useNavigateToLidoRoute';
import { EarnAccountCell } from '../common/EarnAccountCell';

const ETH_DECIMALS = 18;

type EarnLidoAccountRowProps = {
    account: Account;
    isCardLayout: boolean;
};

/** An account's Lido staking, with the same columns as the rows of the other staking products. */
export const EarnLidoAccountRow = ({ account, isCardLayout }: EarnLidoAccountRowProps) => {
    const { CryptoAmountFormatter } = useFormatters();
    const { isBelowMobile } = useLayoutSize();
    const navigateToLidoRoute = useNavigateToLidoRoute(account);
    const { productId, position, rate } = useLidoStaking(account);
    const limits = useSelector(
        state => selectStakingProductDescriptor(state, productId)?.limits ?? null,
    );

    const stakedBalance = new BigNumber(position?.balances.staked ?? 0)
        .shiftedBy(-ETH_DECIMALS)
        .toFixed();
    const hasStake = new BigNumber(stakedBalance).gt(0);

    // An account with nothing staked and nothing to stake has no row, as in the rest of the table.
    if (!hasStake && !new BigNumber(account.availableBalance).gt(0)) {
        return null;
    }

    const formatCryptoAmount = (amount: string) =>
        CryptoAmountFormatter.format(amount, {
            symbol: account.symbol,
            isBalance: true,
            withSymbol: false,
            formatStyle: 'compact-balance',
        });

    const currentRewards = calculateRewards(stakedBalance, rate);
    const potentialRewards = getEarnStakingPotentialRewards({
        currentRewards,
        availableBalance: account.availableBalance,
        limits,
        rate,
        networkSymbol: account.symbol,
    });

    const navigateToStake = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        navigateToLidoRoute('earn-lido-stake');
    };

    const rowTestId = `@earn/dashboard/lido-row/${account.symbol}/${account.index}`;

    const accountCell = (
        <EarnAccountCell
            account={account}
            subtitle={<Translation id="TR_EARN_LIDO_ROW_SUBTITLE" />}
        />
    );
    const rateTooltip = <EarnStakingRateTooltip rateKind="apr" rate={rate} />;
    const currentRewardsColumn = (
        <EarnStakingCurrentRewards
            symbol={account.symbol}
            rewards={currentRewards}
            apy={rate}
            isStakingActive={hasStake}
            formattedStakingBalance={formatCryptoAmount(stakedBalance)}
        />
    );
    const potentialRewardsColumn = (
        <EarnStakingPotentialRewards
            symbol={account.symbol}
            rewards={potentialRewards}
            apy={rate}
            isCardanoNetworkType={false}
            formattedAccountBalance={formatCryptoAmount(account.formattedBalance)}
        />
    );
    const stakeButton = (
        <Button
            intent="brand"
            size="small"
            onClick={navigateToStake}
            data-testid="@earn/dashboard/lido-stake-button"
        >
            <Translation
                id={
                    hasStake
                        ? 'TR_EARN_STAKING_DASHBOARD_STAKE_MORE'
                        : 'TR_EARN_STAKING_DASHBOARD_STAKE_NOW'
                }
            />
        </Button>
    );

    if (isCardLayout) {
        return (
            <Card
                paddingType="small"
                onClick={() => navigateToLidoRoute('earn-lido')}
                data-testid={rowTestId}
            >
                <Column gap={12} width="100%">
                    <Row justifyContent="space-between" alignItems="flex-start">
                        {accountCell}
                        {rateTooltip}
                    </Row>

                    {isBelowMobile ? (
                        <Column gap={4}>
                            {currentRewardsColumn}
                            {rate !== null && (
                                <Icon
                                    as={ArrowDownIcon}
                                    intent="neutral"
                                    priority="secondary"
                                    size={20}
                                />
                            )}
                            {potentialRewardsColumn}
                        </Column>
                    ) : (
                        <Row alignItems="center">
                            <Column flex="2">{currentRewardsColumn}</Column>
                            <Column flex="1">
                                {rate !== null && (
                                    <Icon
                                        as={ArrowRightIcon}
                                        intent="neutral"
                                        priority="secondary"
                                        size={20}
                                    />
                                )}
                            </Column>
                            <Column flex="2">{potentialRewardsColumn}</Column>
                        </Row>
                    )}

                    <Row justifyContent="flex-end">{stakeButton}</Row>
                </Column>
            </Card>
        );
    }

    return (
        <Table.Row onClick={() => navigateToLidoRoute('earn-lido')} data-testid={rowTestId}>
            <Table.Cell>{accountCell}</Table.Cell>
            <Table.Cell>{rateTooltip}</Table.Cell>
            <Table.Cell>
                <Row width="100%" alignItems="center" justifyContent="space-between">
                    {currentRewardsColumn}
                    {rate !== null && (
                        <Icon as={ArrowRightIcon} intent="neutral" priority="secondary" size={20} />
                    )}
                </Row>
            </Table.Cell>
            <Table.Cell>{potentialRewardsColumn}</Table.Cell>
            <Table.Cell align="end">{stakeButton}</Table.Cell>
        </Table.Row>
    );
};
