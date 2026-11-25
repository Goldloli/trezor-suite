import { useEffect, useState } from 'react';

import { openModal } from '@suite/modal';
import { commonQueryKeys, useMutation, useQueryClient } from '@suite-common/react-query';
import { notificationsActions } from '@suite-common/toast-notifications';
import {
    type EvmPendingTxStatus,
    type LidoTransactionData,
    type LidoTransactionKind,
    type YieldFlowDisplayToken,
    findPendingLidoTransaction,
    getAccountTransactionLidoKind,
    selectAccountTransactions,
    useEvmPendingTxStatus,
} from '@suite-common/wallet-core';
import { type Account, type EvmTransactionPurpose } from '@suite-common/wallet-types';
import { findTrackedEvmTransaction } from '@suite-common/wallet-utils';
import { useServices } from '@trezor/dependency-injection';
import { getLidoDeployment } from '@trezor/network-ethereum-suite-common';
import { injectDispatch } from '@trezor/redux-utils';

import { submitLidoTransactionThunk } from '#src/actions/wallet/lido/submitLidoTransactionThunk';
import { useSelector } from '#src/hooks/suite/useSelector';

import { useWrappedNativeDeviceGuard } from '../../yield/common/useWrappedNativeDeviceGuard';

// Only a transfer, an approval and the vault calls have a purpose of their own, so the purpose
// rules out the common replacements and the Lido call itself is checked on top of it.
const PURPOSE_BY_KIND: Record<LidoTransactionKind, EvmTransactionPurpose> = {
    stake: 'unknown',
    approve: 'approve',
    'request-withdrawal': 'unknown',
    claim: 'unknown',
};

export type LidoBroadcast = {
    txid: string;
    amount: string;
};

type SubmitLidoTransactionParams = {
    transaction: LidoTransactionData;
    amount: string;
    token: YieldFlowDisplayToken;
};

type UseLidoTransactionParams = {
    account: Account;
    kind: LidoTransactionKind;
};

export type LidoTransaction = {
    submit: (params: SubmitLidoTransactionParams) => Promise<void>;
    isSubmitting: boolean;
    // What this visit to the flow has broadcast.
    broadcast: LidoBroadcast | null;
    // The account's transaction of this kind that is still to be mined, also one broadcast before
    // the flow was left and reopened.
    pendingTxid: string | null;
    status: EvmPendingTxStatus | null;
    isConfirmed: boolean;
    openTxDetail: (txid: string) => void;
};

/** One Lido transaction of a flow: its submit, the broadcast it led to and its confirmation. */
export const useLidoTransaction = ({
    account,
    kind,
}: UseLidoTransactionParams): LidoTransaction => {
    const { dispatch } = useServices(injectDispatch);
    const queryClient = useQueryClient();
    const ensureDeviceReady = useWrappedNativeDeviceGuard();
    const [broadcast, setBroadcast] = useState<LidoBroadcast | null>(null);
    const accountKey = account.key;
    const deployment = getLidoDeployment(account.symbol);
    const transactions = useSelector(state => selectAccountTransactions(state, accountKey));

    const pendingTransaction =
        deployment === null
            ? undefined
            : findPendingLidoTransaction({ deployment, transactions, kind });
    const trackedTxid = broadcast?.txid ?? pendingTransaction?.txid ?? null;

    const { status: trackedStatus, nonce } = useEvmPendingTxStatus(
        account,
        trackedTxid,
        PURPOSE_BY_KIND[kind],
    );

    // A replacement only shares the nonce: it completes the flow when it makes the same Lido call,
    // as a sped up transaction does, and fails it when it is a cancellation or another call.
    const trackedTransaction =
        trackedTxid === null
            ? undefined
            : findTrackedEvmTransaction({ transactions, txid: trackedTxid, nonce });
    const isReplacedByAnotherCall =
        trackedTransaction?.isReplacement === true &&
        deployment !== null &&
        getAccountTransactionLidoKind({
            deployment,
            transaction: trackedTransaction.transaction,
        }) !== kind;
    const status =
        trackedStatus === 'confirmed' && isReplacedByAnotherCall ? 'failed' : trackedStatus;
    const pendingTxid = status === 'pending' ? trackedTxid : null;

    // What a mined transaction changed is read from the contracts, so those reads start over.
    useEffect(() => {
        if (pendingTxid === null) {
            return undefined;
        }

        return () => {
            void queryClient.invalidateQueries({
                queryKey: commonQueryKeys.lidoWithdrawalRequests(accountKey),
            });
            void queryClient.invalidateQueries({
                queryKey: commonQueryKeys.lidoWithdrawalAllowance(accountKey),
            });
        };
    }, [pendingTxid, accountKey, queryClient]);

    useEffect(() => {
        if (status !== 'failed') {
            return;
        }

        dispatch(
            notificationsActions.addToast({
                type: 'sign-tx-error',
                error: 'The Lido transaction failed.',
            }),
        );
        setBroadcast(null);
    }, [status, dispatch]);

    const mutation = useMutation({
        mutationFn: (params: SubmitLidoTransactionParams) =>
            dispatch(submitLidoTransactionThunk({ account, kind, ...params })).unwrap(),
        onSuccess: (result, { amount }) => {
            if (result) {
                setBroadcast({ txid: result.txid, amount });
            }
        },
    });

    const submit = async (params: SubmitLidoTransactionParams) => {
        if (!(await ensureDeviceReady())) {
            return;
        }

        mutation.mutate(params);
    };

    const openTxDetail = (txid: string) => {
        dispatch(
            openModal({
                type: 'transaction-detail',
                txid,
                descriptor: account.descriptor,
                symbol: account.symbol,
                deviceState: account.deviceState,
                flow: 'detail',
                showCancelButton: true,
            }),
        );
    };

    return {
        submit,
        isSubmitting: mutation.isPending,
        broadcast,
        pendingTxid,
        status,
        isConfirmed: broadcast !== null && status === 'confirmed',
        openTxDetail,
    };
};
