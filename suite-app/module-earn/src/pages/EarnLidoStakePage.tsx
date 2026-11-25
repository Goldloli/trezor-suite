import {
    AccountNotExists,
    LidoFlowLayout,
    LidoStake,
    LidoStakePageHeader,
    useEarnRouteAccount,
    useLayout,
} from '@trezor/suite';

export const EarnLidoStakePage = () => {
    const { account } = useEarnRouteAccount();

    useLayout('Earn', <LidoStakePageHeader account={account} />);

    if (!account) {
        return <AccountNotExists />;
    }

    return (
        <LidoFlowLayout>
            <LidoStake key={account.key} account={account} />
        </LidoFlowLayout>
    );
};
