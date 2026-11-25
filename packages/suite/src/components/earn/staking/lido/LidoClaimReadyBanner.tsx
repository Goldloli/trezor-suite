import { AssetSymbol } from '@suite/assets';
import { Translation } from '@suite/intl';
import { type LidoWithdrawalRequest } from '@suite-common/wallet-core';
import { type Account } from '@suite-common/wallet-types';
import { Banner } from '@trezor/components';
import { HandCoinsIcon } from '@trezor/icons';
import { BigNumber } from '@trezor/utils';

import { FormattedCryptoAmount } from '#src/components/suite/FormattedCryptoAmount';

import { useNavigateToLidoRoute } from './useNavigateToLidoRoute';

const ETH_DECIMALS = 18;

type LidoClaimReadyBannerProps = {
    account: Account;
    claimableRequests: readonly LidoWithdrawalRequest[];
};

export const LidoClaimReadyBanner = ({ account, claimableRequests }: LidoClaimReadyBannerProps) => {
    const navigateToLidoRoute = useNavigateToLidoRoute(account);

    if (claimableRequests.length === 0) {
        return null;
    }

    const claimableAmount = claimableRequests
        .reduce((sum, request) => sum.plus(request.amountOfStETH), new BigNumber(0))
        .shiftedBy(-ETH_DECIMALS)
        .toFixed();

    return (
        <Banner
            icon={HandCoinsIcon}
            intent="neutral"
            data-testid="@staking/lido-claim-banner/container"
            rightContent={
                <Banner.Button
                    onClick={() => navigateToLidoRoute('earn-lido-claim')}
                    data-testid="@staking/lido-claim-banner/claim-button"
                >
                    <Translation
                        id="TR_EARN_LIDO_CLAIM_SUBMIT"
                        values={{ displaySymbol: <AssetSymbol networkSymbol={account.symbol} /> }}
                    />
                </Banner.Button>
            }
            description={
                <span data-testid="@staking/lido-claim-banner/description">
                    <Translation
                        id="TR_EARN_LIDO_CLAIM_READY"
                        values={{
                            amount: (
                                <FormattedCryptoAmount
                                    value={claimableAmount}
                                    networkSymbol={account.symbol}
                                    isCompact
                                />
                            ),
                        }}
                    />
                </span>
            }
        />
    );
};
