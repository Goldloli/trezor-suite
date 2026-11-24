import {
    type StakingRootState,
    formatStakingAmount,
    selectIsStakingAccountActive,
    selectStakingAccountAmount,
} from '@suite-common/earn-staking';
import {
    type TokenDefinition,
    type TokenDefinitionsRootState,
    selectTokenDefinitions,
} from '@suite-common/token-definitions';
import { type TokenAddress, type TokenInfoBranded } from '@suite-common/tokens';
import { isNetworkWithTokens } from '@suite-common/wallet-config';
import {
    type AccountsRootState,
    type FiatRatesRootState,
    type WalletSettingsRootState,
    getTokens,
    selectAccountByKey,
    selectBaseCurrency,
    selectCurrentFiatRates,
} from '@suite-common/wallet-core';
import { type Account, type RatesByKey } from '@suite-common/wallet-types';
import {
    getFiatRateKey,
    isErc4626,
    sortTokensByName,
    toFiatCurrency,
} from '@suite-common/wallet-utils';
import { type TokenInfo } from '@trezor/blockchain-link-types';
import { createWeakMapSelector } from '@trezor/redux-utils';

export type AccountListSectionsRootState = AccountsRootState &
    FiatRatesRootState &
    WalletSettingsRootState &
    TokenDefinitionsRootState &
    StakingRootState;

const createMemoizedSelector = createWeakMapSelector.withTypes<AccountListSectionsRootState>();

export type AccountListSection = (
    | {
          type: 'account';
          account: Account;
          hasAnyKnownTokens: boolean;
      }
    | {
          type: 'staking';
          account: Account;
          stakingCryptoBalance: string;
      }
    | {
          type: 'token';
          account: Account;
          token: TokenInfoBranded;
      }
    | {
          type: 'zeroBalance';
          account: Account;
          tokens: TokenInfoBranded[];
      }
) & {
    isFirst?: boolean;
    isLast?: boolean;
};

export type GetAccountListSectionsParams = {
    account: Account;
    tokenDefinitions: TokenDefinition | undefined;
    isStakingActive: boolean;
    stakingCryptoBalance: string;
    groupZeroBalance?: boolean;
    /** Vault tokens (ERC-4626) among the tokens; mobile lists them in its DeFi tab instead. */
    areVaultTokensListed?: boolean;
    fiatRates?: RatesByKey;
    localCurrency?: ReturnType<typeof selectBaseCurrency>;
};

export const getAccountListSections = ({
    account,
    tokenDefinitions,
    isStakingActive,
    stakingCryptoBalance,
    groupZeroBalance = false,
    areVaultTokensListed = false,
    fiatRates,
    localCurrency,
}: GetAccountListSectionsParams) => {
    const sections: AccountListSection[] = [];
    const isListed = (token: TokenInfo) => areVaultTokensListed || !isErc4626(token);
    const isNetworkSupportingTokens = isNetworkWithTokens(account.symbol);

    const { shownWithBalance: tokensWithBalance, shownWithoutBalance } = getTokens({
        tokens: account.tokens,
        symbol: account.symbol,
        tokenDefinitions,
    });

    const zeroBalanceTokens: TokenInfoBranded[] = groupZeroBalance
        ? (shownWithoutBalance.filter(isListed) as TokenInfoBranded[])
        : [];

    const hasAnyKnownTokens =
        isNetworkSupportingTokens && !!(tokensWithBalance.length + zeroBalanceTokens.length);

    sections.push({
        type: 'account',
        account,
        isLast: !hasAnyKnownTokens && !isStakingActive,
        isFirst: true,
        hasAnyKnownTokens,
    });

    if (isStakingActive) {
        sections.push({
            type: 'staking',
            account,
            stakingCryptoBalance,
            isLast: !hasAnyKnownTokens,
        });
    }

    if (hasAnyKnownTokens) {
        const getTokenFiatValue = (token: { contract: string; balance?: string }): number => {
            if (!fiatRates || !localCurrency) return 0;
            const fiatRateKey = getFiatRateKey(
                account.symbol,
                localCurrency,
                token.contract as TokenAddress,
            );
            const rate = fiatRates[fiatRateKey]?.rate;
            if (!rate || !token.balance) return 0;

            return toFiatCurrency({ amount: token.balance, rate })?.toNumber() ?? 0;
        };

        const tokensToShow = tokensWithBalance
            .filter(isListed)
            .sort((a, b) => getTokenFiatValue(b) - getTokenFiatValue(a));
        tokensToShow.forEach((token, index) => {
            sections.push({
                type: 'token',
                account,
                token: token as TokenInfoBranded,
                isLast: index === tokensToShow.length - 1 && zeroBalanceTokens.length === 0,
            });
        });

        if (zeroBalanceTokens.length > 0) {
            sections.push({
                type: 'zeroBalance',
                account,
                tokens: [...zeroBalanceTokens].sort(sortTokensByName),
            });
        }
    }

    return sections;
};

const EMPTY_ARRAY: AccountListSection[] = [];

const createAccountListSectionsSelector = (areVaultTokensListed: boolean) =>
    createMemoizedSelector(
        [
            selectAccountByKey,
            selectTokenDefinitions,
            selectCurrentFiatRates,
            selectBaseCurrency,
            selectIsStakingAccountActive,
            selectStakingAccountAmount,
        ],
        (account, tokenDefinitions, fiatRates, localCurrency, isStakingActive, stakingAmount) => {
            if (!account) return EMPTY_ARRAY;

            return getAccountListSections({
                account,
                tokenDefinitions: tokenDefinitions[account.symbol]?.coin,
                isStakingActive,
                stakingCryptoBalance: formatStakingAmount({
                    amount: stakingAmount,
                    networkSymbol: account.symbol,
                }),
                groupZeroBalance: true,
                areVaultTokensListed,
                fiatRates,
                localCurrency,
            });
        },
    );

export const selectAccountListSectionsWithZeroBalanceGroup =
    createAccountListSectionsSelector(false);

/** The same sections with the vault tokens among the tokens, as the desktop account overview lists them. */
export const selectAccountListSectionsWithVaultTokens = createAccountListSectionsSelector(true);
