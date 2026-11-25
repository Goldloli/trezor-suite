import {
    AccountNotExists,
    LidoClaim,
    LidoFlowLayout,
    LidoStakePageHeader,
    useEarnRouteAccount,
    useLayout,
} from '@trezor/suite';

export const EarnLidoClaimPage = () => {
    const { account } = useEarnRouteAccount();

    useLayout('Earn', <LidoStakePageHeader account={account} />);

    if (!account) {
        return <AccountNotExists />;
    }

    return (
        <LidoFlowLayout>
            <LidoClaim key={account.key} account={account} />
        </LidoFlowLayout>
    );
};
