import { injectDesktopAnalytics } from '@suite/analytics';
import { Translation, type TranslationKey } from '@suite/intl';
import { EarnAnchor, gotoThunk } from '@suite/router';
import { events as sharedEvents } from '@suite-common/analytics';
import { type Account } from '@suite-common/wallet-types';
import { Badge, type BadgeProps } from '@trezor/components';
import { useServices } from '@trezor/dependency-injection';
import { TrendUpIcon } from '@trezor/icons';
import { injectDispatch } from '@trezor/redux-utils';

import { getYieldOpportunityAnchor } from '#src/components/earn/utils/getYieldOpportunityAnchor';
import { useFormatApy } from '#src/hooks/earn/useFormatApy';

const YIELD_BADGE_TEST_ID = '@earn/yield-badge';

type YieldBadgeVariant = 'inactive' | 'active' | 'promo';

type YieldBadgeVariantConfig = {
    translationId: TranslationKey;
    priority?: BadgeProps['priority'];
    iconLeft?: BadgeProps['iconLeft'];
    /**
     * Token badges point at the vault row of their account, the trade box teaser covers
     * staking too, so it opens the Earn page plain — no anchor, nothing highlighted.
     */
    shouldAnchorAtVaultRow: boolean;
};

const variantConfigMap: Record<YieldBadgeVariant, YieldBadgeVariantConfig> = {
    inactive: {
        translationId: 'TR_EARN_YIELD_BADGE_UP_TO_RATE',
        priority: 'secondary',
        shouldAnchorAtVaultRow: true,
    },
    active: {
        translationId: 'TR_EARN_YIELD_BADGE_RATE',
        shouldAnchorAtVaultRow: true,
    },
    promo: {
        translationId: 'TR_EARN_YIELD_BADGE_UP_TO_RATE',
        iconLeft: TrendUpIcon,
        shouldAnchorAtVaultRow: false,
    },
};

/** Without an account the badge is a plain label: nothing to open on the Earn page for it. */
type YieldBadgeNavigationProps =
    | {
          account: Account;
          vaultId?: string;
          analyticsFrom: 'account-tokens' | 'account-defi-tokens' | 'account-tradebox';
      }
    | { account?: undefined; vaultId?: undefined; analyticsFrom?: undefined };

type YieldBadgeProps = YieldBadgeNavigationProps & {
    apy: number;
    /** `inactive` = eligible but not yielding, `active` = already yielding, `promo` = trade box teaser. */
    variant: YieldBadgeVariant;
};

export const YieldBadge = ({ apy, variant, account, vaultId, analyticsFrom }: YieldBadgeProps) => {
    const { analytics, dispatch } = useServices(injectDesktopAnalytics, injectDispatch);
    const formatApyValue = useFormatApy();

    const { translationId, iconLeft, priority, shouldAnchorAtVaultRow } = variantConfigMap[variant];

    const goToEarnYield = () => {
        if (account === undefined || !vaultId) return;

        // The row anchor scrolls to and highlights the vault row of this very account; the
        // Earn page falls back to scrolling the yield section when that row is not rendered.
        const anchor = shouldAnchorAtVaultRow
            ? (getYieldOpportunityAnchor({ account, vaultId }) ?? EarnAnchor.Yield)
            : undefined;

        dispatch(gotoThunk({ routeName: 'suite-earn', anchor }));

        analytics.report({
            type: sharedEvents.yieldNavigateEvent.name,
            payload: {
                action: 'continue',
                from: analyticsFrom,
                to: 'earn-dashboard',
                networkSymbol: account.symbol,
                vaultId,
            },
        });
    };

    return (
        <Badge
            intent="brand"
            size="small"
            priority={priority}
            iconLeft={iconLeft}
            onClick={account === undefined ? undefined : goToEarnYield}
            data-testid={YIELD_BADGE_TEST_ID}
        >
            <Translation id={translationId} values={{ apy: formatApyValue(apy) }} />
        </Badge>
    );
};
