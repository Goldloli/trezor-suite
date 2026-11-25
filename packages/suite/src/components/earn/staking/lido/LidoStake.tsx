import { useForm, useWatch } from 'react-hook-form';

import { AssetSymbol } from '@suite/assets';
import { Form } from '@suite/form';
import { Translation } from '@suite/intl';
import {
    selectStakingProductDescriptor,
    useRefreshStakingProductInfo,
} from '@suite-common/earn-staking';
import { getNetwork, getNetworkDisplaySymbol } from '@suite-common/wallet-config';
import {
    type YieldFlowDisplayToken,
    type YieldFlowFormValues,
    buildLidoStakeTransaction,
    convertETHToWstETH,
} from '@suite-common/wallet-core';
import { type Account } from '@suite-common/wallet-types';
import { Banner, Button, Card, Column, Row, Text } from '@trezor/components';
import { BigNumber } from '@trezor/utils';

import { FormattedCryptoAmount } from '#src/components/suite/FormattedCryptoAmount';
import { useSelector } from '#src/hooks/suite/useSelector';

import { LidoFlowComplete } from './LidoFlowComplete';
import { useLidoStaking } from './useLidoStaking';
import { useLidoTransaction } from './useLidoTransaction';
import { YieldAmountCard } from '../../yield/common/YieldAmountCard';
import { YieldFlowTransferRow } from '../../yield/common/YieldFlowTransferRow';
import { YieldPendingTransaction } from '../../yield/common/YieldPendingTransaction';

type LidoStakeProps = {
    account: Account;
};

export const LidoStake = ({ account }: LidoStakeProps) => {
    useRefreshStakingProductInfo();

    const { deployment, productId, wstETHToken, wstETHValue } = useLidoStaking(account);
    const limits = useSelector(state => selectStakingProductDescriptor(state, productId)?.limits);
    const transaction = useLidoTransaction({ account, kind: 'stake' });

    const methods = useForm<YieldFlowFormValues>({
        mode: 'onChange',
        defaultValues: { amountInput: '', fiatInput: '' },
    });
    const amountInput = useWatch({ control: methods.control, name: 'amountInput' });

    const { decimals } = getNetwork(account.symbol);
    const nativeToken: YieldFlowDisplayToken = {
        networkSymbol: account.symbol,
        symbol: getNetworkDisplaySymbol(account.symbol),
        decimals,
    };

    if (deployment === null || wstETHToken === null) {
        return (
            <Banner intent="warning" description={<Translation id="TR_EARN_LIDO_UNAVAILABLE" />} />
        );
    }

    const amount = new BigNumber(amountInput || 0);
    const ethAmount = amount.shiftedBy(decimals).integerValue(BigNumber.ROUND_DOWN).toFixed(0);

    // The fee buffer stays behind, so a later withdrawal can still be paid for.
    const maxAmount = BigNumber.max(
        new BigNumber(account.availableBalance).minus(limits?.feeBufferBalance ?? 0),
        0,
    ).shiftedBy(-decimals);

    const isAmountTooHigh = amount.gt(account.formattedBalance);
    const isAmountValid = amount.gt(0) && !isAmountTooHigh && methods.formState.isValid;

    const receivingAmount =
        wstETHValue === null
            ? null
            : new BigNumber(convertETHToWstETH({ ethAmount, wstETHValue }))
                  .shiftedBy(-wstETHToken.decimals)
                  .toFixed();

    const handleSubmit = methods.handleSubmit(() => {
        const stakeTransaction = buildLidoStakeTransaction({ deployment, ethAmount });

        if (stakeTransaction === null) {
            return;
        }

        return transaction.submit({
            transaction: stakeTransaction,
            amount: amount.toFixed(),
            token: nativeToken,
        });
    });

    if (transaction.broadcast && transaction.isConfirmed) {
        return (
            <LidoFlowComplete
                account={account}
                heading={<Translation id="TR_EARN_LIDO_STAKE_COMPLETE" />}
                description={
                    <Translation
                        id="TR_EARN_LIDO_STAKE_COMPLETE_DESCRIPTION"
                        values={{ displaySymbol: <AssetSymbol networkSymbol={account.symbol} /> }}
                    />
                }
            >
                <YieldFlowTransferRow
                    inputLabelId="TR_EARN_LIDO_STAKE_AMOUNT"
                    outputLabelId="TR_RECEIVED"
                    input={{ token: nativeToken, amount: transaction.broadcast.amount }}
                    output={{ token: wstETHToken, amount: receivingAmount ?? '0' }}
                />
            </LidoFlowComplete>
        );
    }

    const { formState } = methods;
    const hasPendingTransaction = transaction.pendingTxid !== null;

    return (
        <>
            <Text typographyStyle="headline-md" data-testid="@staking/lido-stake/title">
                <Translation
                    id="TR_EARN_LIDO_STAKE_TITLE"
                    values={{ displaySymbol: <AssetSymbol networkSymbol={account.symbol} /> }}
                />
            </Text>

            <Form form={methods} formState={formState}>
                <Column gap={16}>
                    <YieldAmountCard
                        tokenSymbol={<AssetSymbol networkSymbol={account.symbol} />}
                        decimals={decimals}
                        isDisabled={hasPendingTransaction}
                        approxFiat={{ symbol: account.symbol }}
                        heading={{ amountLabelTranslationId: 'TR_EARN_LIDO_STAKE_AMOUNT' }}
                        summary={{
                            labelTranslationId: 'TR_EARN_LIDO_STAKE_AVAILABLE',
                            value: (
                                <FormattedCryptoAmount
                                    value={account.formattedBalance}
                                    networkSymbol={account.symbol}
                                />
                            ),
                            onMaxClick: hasPendingTransaction
                                ? undefined
                                : () =>
                                      methods.setValue('amountInput', maxAmount.toFixed(), {
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
                                <Translation id="TR_EARN_LIDO_STAKE_RECEIVING" />
                            </Text>
                            <Text
                                typographyStyle="body-md"
                                data-testid="@staking/lido-stake/receiving-amount"
                            >
                                {receivingAmount === null ? (
                                    '–'
                                ) : (
                                    <FormattedCryptoAmount
                                        value={receivingAmount}
                                        networkSymbol={wstETHToken.symbol}
                                    />
                                )}
                            </Text>
                        </Row>
                    </Card>

                    <Button
                        size="large"
                        onClick={handleSubmit}
                        isLoading={transaction.isSubmitting}
                        isDisabled={!isAmountValid || hasPendingTransaction}
                        data-testid="@staking/lido-stake/submit-button"
                    >
                        <Translation
                            id="TR_EARN_LIDO_STAKE_SUBMIT"
                            values={{
                                displaySymbol: <AssetSymbol networkSymbol={account.symbol} />,
                            }}
                        />
                    </Button>

                    {transaction.pendingTxid !== null && (
                        <YieldPendingTransaction
                            pendingTransaction={{
                                type: 'deposit',
                                txid: transaction.pendingTxid,
                                amount: transaction.broadcast?.amount ?? '',
                            }}
                            onTxClick={transaction.openTxDetail}
                        />
                    )}
                </Column>
            </Form>
        </>
    );
};
