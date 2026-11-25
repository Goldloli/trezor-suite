import { Translation } from '@suite/intl';
import { selectStakingProductDescriptor } from '@suite-common/earn-staking';
import { type Account } from '@suite-common/wallet-types';
import { Button, Card, Column, Row, Text } from '@trezor/components';
import { PlusIcon } from '@trezor/icons';
import { TokenIcon } from '@trezor/product-components';
import { BigNumber } from '@trezor/utils';

import { BaseCurrencyValue } from '#src/components/suite/BaseCurrencyValue';
import { FormattedCryptoAmount } from '#src/components/suite/FormattedCryptoAmount';
import { useSelector } from '#src/hooks/suite/useSelector';

import { useLidoStaking } from './useLidoStaking';
import { useNavigateToLidoRoute } from './useNavigateToLidoRoute';

const ETH_DECIMALS = 18;

type LidoStakedCardProps = {
    account: Account;
};

/** The stake in fiat with the wstETH that holds it, and the two ways to change it. */
export const LidoStakedCard = ({ account }: LidoStakedCardProps) => {
    const navigateToLidoRoute = useNavigateToLidoRoute(account);
    const { productId, position, wstETHToken, wstETHBalance, rate } = useLidoStaking(account);
    const limits = useSelector(state => selectStakingProductDescriptor(state, productId)?.limits);

    const stakedAmount = new BigNumber(position?.balances.staked ?? 0)
        .shiftedBy(-ETH_DECIMALS)
        .toFixed();
    const hasStake = new BigNumber(wstETHBalance).gt(0);
    const tokenAmount = new BigNumber(wstETHBalance)
        .shiftedBy(-(wstETHToken?.decimals ?? ETH_DECIMALS))
        .toFixed();
    // Without the wstETH value the stake cannot be priced, so the card leads with the tokens.
    const isStakeValueKnown = position !== null || !hasStake;

    // What the balance left to stake would earn in a year, the fee buffer kept aside.
    const yearlyRewardsOfBalance =
        rate === null
            ? null
            : BigNumber.max(
                  new BigNumber(account.availableBalance).minus(limits?.feeBufferBalance ?? 0),
                  0,
              )
                  .shiftedBy(-ETH_DECIMALS)
                  .times(rate)
                  .div(100);

    return (
        <Card paddingType="normal" data-testid="@staking/lido-staked-card/container">
            <Column gap={16} alignItems="stretch">
                <Column gap={8} alignItems="flex-start">
                    <Text typographyStyle="body-xs" intent="neutral" priority="secondary">
                        <Translation id="TR_EARN_LIDO_CARD_STAKED" />
                    </Text>

                    <Text
                        typographyStyle="headline-md"
                        data-testid="@staking/lido-staked-card/staked-amount"
                    >
                        {isStakeValueKnown || wstETHToken === null ? (
                            <BaseCurrencyValue amount={stakedAmount} symbol={account.symbol} />
                        ) : (
                            <FormattedCryptoAmount
                                value={tokenAmount}
                                networkSymbol={wstETHToken.symbol}
                                isCompact
                            />
                        )}
                    </Text>

                    {isStakeValueKnown && wstETHToken !== null && (
                        <Row gap={6} alignItems="center">
                            <TokenIcon
                                size={20}
                                networkSymbol={account.symbol}
                                contractAddress={wstETHToken.contractAddress ?? null}
                                placeholder={wstETHToken.symbol}
                                isBordered={false}
                            />
                            <Text
                                typographyStyle="body-sm"
                                intent="neutral"
                                priority="secondary"
                                data-testid="@staking/lido-staked-card/token-amount"
                            >
                                <FormattedCryptoAmount
                                    value={tokenAmount}
                                    networkSymbol={wstETHToken.symbol}
                                    isCompact
                                />
                            </Text>
                        </Row>
                    )}
                </Column>

                <Column gap={8} alignItems="stretch">
                    <Row gap={8}>
                        <Button
                            size="large"
                            flex="1"
                            intent="brand"
                            priority="primary"
                            iconLeft={PlusIcon}
                            onClick={() => navigateToLidoRoute('earn-lido-stake')}
                            data-testid="@staking/lido-staked-card/stake-button"
                        >
                            <Translation
                                id={
                                    hasStake
                                        ? 'TR_EARN_STAKING_DASHBOARD_STAKE_MORE'
                                        : 'TR_EARN_STAKING_DASHBOARD_STAKE_NOW'
                                }
                            />
                        </Button>

                        {hasStake && (
                            <Button
                                size="large"
                                flex="1"
                                intent="brand"
                                priority="secondary"
                                onClick={() => navigateToLidoRoute('earn-lido-unstake')}
                                data-testid="@staking/lido-staked-card/unstake-button"
                            >
                                <Translation id="TR_STAKE_UNSTAKE" />
                            </Button>
                        )}
                    </Row>

                    {yearlyRewardsOfBalance !== null && yearlyRewardsOfBalance.gt(0) && (
                        <Text typographyStyle="body-sm" intent="neutral" priority="secondary">
                            <Translation
                                id="TR_EARN_LIDO_EARN_MORE"
                                values={{
                                    amount: (
                                        <BaseCurrencyValue
                                            amount={yearlyRewardsOfBalance.toFixed()}
                                            symbol={account.symbol}
                                            showApproximationIndicator
                                        />
                                    ),
                                    highlight: chunks => (
                                        <Text typographyStyle="body-sm-strong" intent="brand">
                                            {chunks}
                                        </Text>
                                    ),
                                }}
                            />
                        </Text>
                    )}
                </Column>
            </Column>
        </Card>
    );
};
