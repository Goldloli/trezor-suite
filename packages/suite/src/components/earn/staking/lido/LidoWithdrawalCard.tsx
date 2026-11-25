import { Translation } from '@suite/intl';
import { type NetworkSymbol } from '@suite-common/wallet-config';
import { type LidoWithdrawalRequest } from '@suite-common/wallet-core';
import { Card, Collapsible, Column, type Padding, Row, StepList, Text } from '@trezor/components';
import { BigNumber } from '@trezor/utils';

import { BaseCurrencyValue } from '#src/components/suite/BaseCurrencyValue';
import { CountdownTimer } from '#src/components/suite/CountdownTimer';
import { FormattedCryptoAmount } from '#src/components/suite/FormattedCryptoAmount';

const ETH_DECIMALS = 18;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const HEADER_PADDING = { vertical: 12, horizontal: 16 } satisfies Padding;
const CONTENT_PADDING = { bottom: 12, horizontal: 16 } satisfies Padding;

type LidoWithdrawalCardProps = {
    request: LidoWithdrawalRequest;
    symbol: NetworkSymbol;
    // How long the queue takes now; null when it is not known.
    withdrawalDays: number | null;
};

/** One withdrawal Lido has not finalized yet; it opens to show where the withdrawal stands. */
export const LidoWithdrawalCard = ({
    request,
    symbol,
    withdrawalDays,
}: LidoWithdrawalCardProps) => {
    const { id, amountOfStETH, requestedAt } = request;
    // The wait of the whole queue, counted from the request: asking Lido about this one request
    // would tell it which account is asking.
    const estimatedFinalizationAt =
        withdrawalDays === null ? null : requestedAt + withdrawalDays * DAY_IN_MS;
    const testIdPrefix = `@staking/lido-withdrawal-card/${id}`;
    const amount = new BigNumber(amountOfStETH).shiftedBy(-ETH_DECIMALS).toFixed();

    return (
        <Card paddingType="none" data-testid={`${testIdPrefix}/container`}>
            <Collapsible>
                <Collapsible.Toggle>
                    <Row
                        data-testid={`${testIdPrefix}/toggle`}
                        justifyContent="space-between"
                        alignItems="center"
                        gap={12}
                        padding={HEADER_PADDING}
                    >
                        <Text typographyStyle="body-sm-strong">
                            {estimatedFinalizationAt === null ? (
                                <Translation id="TR_EARN_LIDO_UNSTAKING_TITLE" />
                            ) : (
                                <CountdownTimer
                                    deadline={estimatedFinalizationAt}
                                    message="TR_EARN_LIDO_UNSTAKING_TITLE_WITH_TIME"
                                    pastDeadlineMessage="TR_EARN_LIDO_UNSTAKING_TITLE"
                                    minUnit="hour"
                                    minUnitValue={1}
                                    unitDisplay="long"
                                    isApproximate
                                />
                            )}
                        </Text>

                        <Row gap={12} alignItems="center">
                            <Column alignItems="flex-end">
                                <Text
                                    typographyStyle="body-sm"
                                    data-testid={`${testIdPrefix}/amount`}
                                >
                                    <BaseCurrencyValue amount={amount} symbol={symbol} />
                                </Text>

                                <Text
                                    typographyStyle="body-sm"
                                    intent="neutral"
                                    priority="secondary"
                                >
                                    <FormattedCryptoAmount
                                        value={amount}
                                        networkSymbol={symbol}
                                        isCompact
                                    />
                                </Text>
                            </Column>

                            <Collapsible.ToggleIcon size={20} />
                        </Row>
                    </Row>
                </Collapsible.Toggle>

                <Collapsible.Content>
                    <Column padding={CONTENT_PADDING}>
                        <StepList bulletSize="small" gap={16}>
                            <StepList.Item
                                state="done"
                                title={<Translation id="TR_TX_CONFIRMED" />}
                            />
                            <StepList.Item
                                state="active"
                                title={<Translation id="TR_EARN_LIDO_STEP_IN_QUEUE" />}
                            />
                            <StepList.Item
                                state="pending"
                                title={<Translation id="TR_STAKE_UNSTAKED_AND_READY_TO_CLAIM" />}
                            />
                        </StepList>
                    </Column>
                </Collapsible.Content>
            </Collapsible>
        </Card>
    );
};
