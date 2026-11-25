import {
    AccountNotExists,
    LidoDashboard,
    LidoStakePageHeader,
    useEarnRouteAccount,
    useLayout,
} from '@trezor/suite';

export const EarnLidoPage = () => {
    const { account } = useEarnRouteAccount();

    useLayout('Earn', <LidoStakePageHeader account={account} />);

    if (!account) {
        return <AccountNotExists />;
    }

    return <LidoDashboard key={account.key} account={account} />;
};
