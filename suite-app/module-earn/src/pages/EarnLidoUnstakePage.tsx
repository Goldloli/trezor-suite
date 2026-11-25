import {
    AccountNotExists,
    LidoFlowLayout,
    LidoStakePageHeader,
    LidoUnstake,
    useEarnRouteAccount,
    useLayout,
} from '@trezor/suite';

export const EarnLidoUnstakePage = () => {
    const { account } = useEarnRouteAccount();

    useLayout('Earn', <LidoStakePageHeader account={account} />);

    if (!account) {
        return <AccountNotExists />;
    }

    return (
        <LidoFlowLayout>
            <LidoUnstake key={account.key} account={account} />
        </LidoFlowLayout>
    );
};
