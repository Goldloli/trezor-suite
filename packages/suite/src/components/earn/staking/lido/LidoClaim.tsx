import { AssetSymbol } from '@suite/assets';
import { Translation } from '@suite/intl';
import { useMutation } from '@suite-common/react-query';
import { getNetwork, getNetworkDisplaySymbol } from '@suite-common/wallet-config';
import {
    type YieldFlowDisplayToken,
    buildLidoClaimWithdrawalsTransaction,
    fetchLidoClaimHints,
} from '@suite-common/wallet-core';
import { type Account } from '@suite-common/wallet-types';
import { Banner, Button, Card, Column, Row, Text } from '@trezor/components';
import { BigNumber } from '@trezor/utils';

import { FormattedCryptoAmount } from '#src/components/suite/FormattedCryptoAmount';

import { LidoFlowComplete } from './LidoFlowComplete';
import { useLidoStaking } from './useLidoStaking';
import { useLidoTransaction } from './useLidoTransaction';
import { useLidoWithdrawalRequests } from './useLidoWithdrawalRequests';
import { YieldPendingTransaction } from '../../yield/common/YieldPendingTransaction';

type LidoClaimProps = {
    account: Account;
};

export const LidoClaim = ({ account }: LidoClaimProps) => {
    const { deployment } = useLidoStaking(account);
    const { claimableRequests, isLoading } = useLidoWithdrawalRequests(account);
    const transaction = useLidoTransaction({ account, kind: 'claim' });

    const { decimals } = getNetwork(account.symbol);
    const nativeToken: YieldFlowDisplayToken = {
        networkSymbol: account.symbol,
        symbol: getNetworkDisplaySymbol(account.symbol),
        decimals,
    };
    const displaySymbol = <AssetSymbol networkSymbol={account.symbol} />;

    // A slashing can lower what a finalized request pays out, so the amount requested is its
    // upper bound.
    const claimableAmount = claimableRequests
        .reduce((sum, request) => sum.plus(request.amountOfStETH), new BigNumber(0))
        .shiftedBy(-decimals)
        .toFixed();

    const claimMutation = useMutation({
        mutationFn: async () => {
            if (deployment === null) {
                return;
            }

            const requestIds = claimableRequests.map(({ id }) => id);
            const hints = await fetchLidoClaimHints({ account, deployment, requestIds });
            const claimTransaction = buildLidoClaimWithdrawalsTransaction({
                deployment,
                requestIds,
                hints,
            });

            if (claimTransaction === null) {
                return;
            }

            await transaction.submit({
                transaction: claimTransaction,
                amount: claimableAmount,
                token: nativeToken,
            });
        },
    });

    if (deployment === null) {
        return (
            <Banner intent="warning" description={<Translation id="TR_EARN_LIDO_UNAVAILABLE" />} />
        );
    }

    if (transaction.broadcast && transaction.isConfirmed) {
        return (
            <LidoFlowComplete
                account={account}
                heading={<Translation id="TR_EARN_LIDO_CLAIM_COMPLETE" />}
                description={
                    <Translation
                        id="TR_EARN_LIDO_CLAIM_COMPLETE_DESCRIPTION"
                        values={{ displaySymbol }}
                    />
                }
            />
        );
    }

    const hasClaimableRequests = claimableRequests.length > 0;

    return (
        <Column gap={16}>
            <Text typographyStyle="headline-md" data-testid="@staking/lido-claim/title">
                <Translation id="TR_EARN_LIDO_CLAIM_TITLE" values={{ displaySymbol }} />
            </Text>

            {hasClaimableRequests || transaction.pendingTxid !== null ? (
                <Card type="contrast" paddingType="small">
                    <Row justifyContent="space-between" alignItems="center" gap={8}>
                        <Text typographyStyle="body-md">
                            <Translation id="TR_EARN_LIDO_CLAIM_AMOUNT" />
                        </Text>
                        <Text typographyStyle="body-md" data-testid="@staking/lido-claim/amount">
                            <FormattedCryptoAmount
                                value={transaction.broadcast?.amount ?? claimableAmount}
                                networkSymbol={account.symbol}
                            />
                        </Text>
                    </Row>
                </Card>
            ) : (
                !isLoading && (
                    <Banner
                        intent="info"
                        description={<Translation id="TR_EARN_LIDO_CLAIM_EMPTY" />}
                    />
                )
            )}

            <Button
                size="large"
                onClick={() => claimMutation.mutate()}
                isLoading={claimMutation.isPending || transaction.isSubmitting}
                isDisabled={!hasClaimableRequests || transaction.pendingTxid !== null}
                data-testid="@staking/lido-claim/submit-button"
            >
                <Translation id="TR_EARN_LIDO_CLAIM_SUBMIT" values={{ displaySymbol }} />
            </Button>

            {transaction.pendingTxid !== null && (
                <YieldPendingTransaction
                    pendingTransaction={{
                        type: 'claim',
                        txid: transaction.pendingTxid,
                        amount: transaction.broadcast?.amount ?? '',
                    }}
                    onTxClick={transaction.openTxDetail}
                />
            )}
        </Column>
    );
};
