import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { AssetSymbol } from '@suite/assets';
import { Form } from '@suite/form';
import { Translation } from '@suite/intl';
import { commonQueryKeys, useQuery } from '@suite-common/react-query';
import {
    type YieldFlowFormValues,
    buildLidoApproveTransaction,
    buildLidoRequestWithdrawalsTransaction,
    convertWstETHToETH,
    fetchAllowance,
    splitLidoWithdrawalAmount,
} from '@suite-common/wallet-core';
import { type Account } from '@suite-common/wallet-types';
import {
    Banner,
    Button,
    Card,
    Column,
    Row,
    StepList,
    type StepListItemState,
    Text,
} from '@trezor/components';
import { BigNumber } from '@trezor/utils';

import { FormattedCryptoAmount } from '#src/components/suite/FormattedCryptoAmount';

import { LidoFlowComplete } from './LidoFlowComplete';
import { useLidoStaking } from './useLidoStaking';
import { useLidoTransaction } from './useLidoTransaction';
import { YieldAmountCard } from '../../yield/common/YieldAmountCard';
import { YieldPendingTransaction } from '../../yield/common/YieldPendingTransaction';

type LidoUnstakeQueueProps = {
    account: Account;
    /** Reported upward because the choice of the exit lives outside this subtree. */
    onCompleteChange: (isComplete: boolean) => void;
};

export const LidoUnstakeQueue = ({ account, onCompleteChange }: LidoUnstakeQueueProps) => {
    const { deployment, wstETHToken, wstETHBalance, wstETHValue, withdrawalDays } =
        useLidoStaking(account);
    const approval = useLidoTransaction({ account, kind: 'approve' });
    const request = useLidoTransaction({ account, kind: 'request-withdrawal' });

    const methods = useForm<YieldFlowFormValues>({
        mode: 'onChange',
        defaultValues: { amountInput: '', fiatInput: '' },
    });
    const amountInput = useWatch({ control: methods.control, name: 'amountInput' });

    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- cache identity is account.key; the descriptor, the symbol and the deployment all follow from the account
    const allowanceQuery = useQuery({
        queryKey: commonQueryKeys.lidoWithdrawalAllowance(account.key),
        queryFn: async () =>
            deployment === null
                ? '0'
                : (
                      await fetchAllowance({
                          owner: account.descriptor,
                          spender: deployment.withdrawalQueue,
                          tokenContractAddress: deployment.wstETH,
                          coin: account.symbol,
                      })
                  ).toFixed(0),
        enabled: deployment !== null,
    });
    const { data: allowance = null, isFetching: isAllowanceFetching } = allowanceQuery;

    const isRequestConfirmed = request.isConfirmed;

    useEffect(() => {
        onCompleteChange(isRequestConfirmed);
    }, [isRequestConfirmed, onCompleteChange]);

    if (deployment === null || wstETHToken === null) {
        return (
            <Banner intent="warning" description={<Translation id="TR_EARN_LIDO_UNAVAILABLE" />} />
        );
    }

    if (wstETHValue === null) {
        return (
            <Banner
                intent="warning"
                description={<Translation id="TR_EARN_LIDO_VALUE_UNKNOWN" />}
            />
        );
    }

    const displaySymbol = <AssetSymbol networkSymbol={account.symbol} />;
    const balance = new BigNumber(wstETHBalance).shiftedBy(-wstETHToken.decimals);
    const amount = new BigNumber(amountInput || 0);
    const wstETHAmount = amount
        .shiftedBy(wstETHToken.decimals)
        .integerValue(BigNumber.ROUND_DOWN)
        .toFixed(0);
    const payoutAmount = new BigNumber(convertWstETHToETH({ wstETHAmount, wstETHValue }))
        .shiftedBy(-wstETHToken.decimals)
        .toFixed();

    const isAmountTooHigh = amount.gt(balance);
    const isAmountValid = amount.gt(0) && !isAmountTooHigh && methods.formState.isValid;
    const isApprovalNeeded = allowance === null || new BigNumber(allowance).lt(wstETHAmount);
    const hasPendingTransaction = approval.pendingTxid !== null || request.pendingTxid !== null;

    const getStepState = (step: 'approve' | 'request'): StepListItemState => {
        if (step === 'approve') {
            return isApprovalNeeded ? 'active' : 'done';
        }

        return isApprovalNeeded ? 'pending' : 'active';
    };

    const handleApprove = methods.handleSubmit(() => {
        const transaction = buildLidoApproveTransaction({
            deployment,
            owner: account.descriptor,
            wstETHAmount,
        });

        if (transaction === null) {
            return;
        }

        return approval.submit({ transaction, amount: amount.toFixed(), token: wstETHToken });
    });

    const handleRequest = methods.handleSubmit(() => {
        const transaction = buildLidoRequestWithdrawalsTransaction({
            deployment,
            owner: account.descriptor,
            wstETHAmounts: splitLidoWithdrawalAmount({ wstETHAmount, wstETHValue }),
        });

        if (transaction === null) {
            return;
        }

        return request.submit({ transaction, amount: amount.toFixed(), token: wstETHToken });
    });

    if (request.broadcast && request.isConfirmed) {
        return (
            <LidoFlowComplete
                account={account}
                heading={<Translation id="TR_EARN_LIDO_UNSTAKE_COMPLETE" />}
                description={
                    <Translation
                        id="TR_EARN_LIDO_UNSTAKE_COMPLETE_DESCRIPTION"
                        values={{ displaySymbol }}
                    />
                }
            />
        );
    }

    const { formState } = methods;

    return (
        <Form form={methods} formState={formState}>
            <Column gap={16}>
                <Text intent="neutral" priority="secondary">
                    {withdrawalDays === null ? (
                        <Translation
                            id="TR_EARN_LIDO_UNSTAKE_QUEUE_DESCRIPTION_WITHOUT_DAYS"
                            values={{ displaySymbol }}
                        />
                    ) : (
                        <Translation
                            id="TR_EARN_LIDO_UNSTAKE_QUEUE_DESCRIPTION"
                            values={{ displaySymbol, days: Math.ceil(withdrawalDays) }}
                        />
                    )}
                </Text>

                <YieldAmountCard
                    tokenSymbol={wstETHToken.symbol}
                    decimals={wstETHToken.decimals}
                    isDisabled={hasPendingTransaction}
                    approxFiat={{
                        symbol: account.symbol,
                        tokenContractAddress: wstETHToken.contractAddress,
                    }}
                    heading={{ amountLabelTranslationId: 'TR_EARN_LIDO_UNSTAKE_AMOUNT' }}
                    summary={{
                        labelTranslationId: 'TR_EARN_LIDO_UNSTAKE_AVAILABLE',
                        value: (
                            <FormattedCryptoAmount
                                value={balance.toFixed()}
                                networkSymbol={wstETHToken.symbol}
                            />
                        ),
                        onMaxClick: hasPendingTransaction
                            ? undefined
                            : () =>
                                  methods.setValue('amountInput', balance.toFixed(), {
                                      shouldValidate: true,
                                  }),
                    }}
                    warning={
                        isAmountTooHigh ? (
                            <Banner
                                intent="warning"
                                description={<Translation id="TR_NOT_ENOUGH_FUNDS" />}
                            />
                        ) : undefined
                    }
                />

                <Card type="contrast" paddingType="small">
                    <Row justifyContent="space-between" alignItems="center" gap={8}>
                        <Text typographyStyle="body-md">
                            <Translation id="TR_EARN_LIDO_UNSTAKE_RECEIVING" />
                        </Text>
                        <Text
                            typographyStyle="body-md"
                            data-testid="@staking/lido-unstake/payout-amount"
                        >
                            <FormattedCryptoAmount
                                value={payoutAmount}
                                networkSymbol={account.symbol}
                            />
                        </Text>
                    </Row>
                </Card>

                <StepList isOrdered bulletSize="large" bulletGap={12} gap={24} titleGap={16}>
                    <StepList.Item
                        state={getStepState('approve')}
                        title={<Translation id="TR_EARN_LIDO_UNSTAKE_APPROVE_STEP" />}
                        data-testid="@staking/lido-unstake/approve-step"
                    >
                        {isApprovalNeeded && (
                            <Column gap={16}>
                                <Button
                                    size="large"
                                    onClick={handleApprove}
                                    isLoading={approval.isSubmitting}
                                    isDisabled={
                                        !isAmountValid ||
                                        hasPendingTransaction ||
                                        isAllowanceFetching
                                    }
                                    data-testid="@staking/lido-unstake/approve-button"
                                >
                                    <Translation id="TR_EARN_LIDO_UNSTAKE_APPROVE_SUBMIT" />
                                </Button>

                                {approval.pendingTxid !== null && (
                                    <YieldPendingTransaction
                                        pendingTransaction={{
                                            type: 'approve',
                                            txid: approval.pendingTxid,
                                            amount: approval.broadcast?.amount ?? '',
                                        }}
                                        onTxClick={approval.openTxDetail}
                                    />
                                )}
                            </Column>
                        )}
                    </StepList.Item>

                    <StepList.Item
                        state={getStepState('request')}
                        title={<Translation id="TR_EARN_LIDO_UNSTAKE_REQUEST_STEP" />}
                        data-testid="@staking/lido-unstake/request-step"
                    >
                        {!isApprovalNeeded && (
                            <Column gap={16}>
                                <Button
                                    size="large"
                                    onClick={handleRequest}
                                    isLoading={request.isSubmitting}
                                    isDisabled={!isAmountValid || hasPendingTransaction}
                                    data-testid="@staking/lido-unstake/request-button"
                                >
                                    <Translation id="TR_EARN_LIDO_UNSTAKE_REQUEST_SUBMIT" />
                                </Button>

                                {request.pendingTxid !== null && (
                                    <YieldPendingTransaction
                                        pendingTransaction={{
                                            type: 'withdraw',
                                            txid: request.pendingTxid,
                                            amount: request.broadcast?.amount ?? '',
                                        }}
                                        onTxClick={request.openTxDetail}
                                    />
                                )}
                            </Column>
                        )}
                    </StepList.Item>
                </StepList>
            </Column>
        </Form>
    );
};
