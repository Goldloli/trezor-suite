import { selectFullSelectedAccount } from '@suite/account';
import { AccountHiddenTokens, WalletLayout, useSelector } from '@trezor/suite';

/** The hidden tokens of the account the route's path names, as its asset overview lists assets. */
export const AccountHiddenTokensPage = () => {
    const selectedAccount = useSelector(selectFullSelectedAccount);

    return (
        <WalletLayout title="TR_HIDDEN_TOKENS" account={selectedAccount} isSubpage>
            {selectedAccount.status === 'loaded' && (
                <AccountHiddenTokens accountKey={selectedAccount.account.key} />
            )}
        </WalletLayout>
    );
};
