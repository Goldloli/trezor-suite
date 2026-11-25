import { type ReactNode } from 'react';

import { AssetTableFrame } from '@suite/assets';
import { Translation } from '@suite/intl';
import { type TokenInfoBranded } from '@suite-common/tokens';
import {
    selectAccountByKey,
    selectAccountManuallyHiddenTokens,
    selectAccountUnrecognizedTokens,
} from '@suite-common/wallet-core';
import { type Account, type AccountKey } from '@suite-common/wallet-types';
import { Column, Text } from '@trezor/components';

import { useSelector } from '#src/hooks/suite/useSelector';
import { NoTokens } from '#src/views/wallet/tokens/common/NoTokens';

import { AccountAssetSectionRow } from './AccountAssetSectionRow';

type AccountHiddenTokensTableProps = {
    account: Account;
    tokens: readonly TokenInfoBranded[];
    heading: ReactNode;
    'data-testid': string;
};

const AccountHiddenTokensTable = ({
    account,
    tokens,
    heading,
    'data-testid': dataTestId,
}: AccountHiddenTokensTableProps) => (
    <AssetTableFrame
        banner={
            <Text
                typographyStyle="body-sm"
                intent="neutral"
                priority="secondary"
                margin={{ top: 16, left: 20 }}
            >
                {heading}
            </Text>
        }
        assetHeader={<Translation id="TR_ASSET" />}
        data-testid={dataTestId}
    >
        {tokens.map(token => (
            <AccountAssetSectionRow
                key={token.contract}
                section={{ type: 'token', account, token }}
            />
        ))}
    </AssetTableFrame>
);

type AccountHiddenTokensProps = {
    accountKey: AccountKey;
};

/**
 * The tokens the account's Tokens tab lists as hidden, drawn as the rows of its asset overview:
 * those the user hid, then those Trezor does not recognize.
 */
export const AccountHiddenTokens = ({ accountKey }: AccountHiddenTokensProps) => {
    const account = useSelector(state => selectAccountByKey(state, accountKey));
    const hiddenByUser = useSelector(state => selectAccountManuallyHiddenTokens(state, accountKey));
    const unrecognized = useSelector(state => selectAccountUnrecognizedTokens(state, accountKey));

    if (account === null || (hiddenByUser.length === 0 && unrecognized.length === 0)) {
        return (
            <NoTokens
                title={<Translation id="TR_HIDDEN_TOKENS_EMPTY" />}
                data-testid="@account-hidden-tokens/empty"
            />
        );
    }

    return (
        <Column gap={16} alignItems="stretch" data-testid="@account-hidden-tokens">
            {hiddenByUser.length > 0 && (
                <AccountHiddenTokensTable
                    account={account}
                    tokens={hiddenByUser}
                    heading={<Translation id="TR_HIDDEN_TOKENS" />}
                    data-testid="@account-hidden-tokens/hidden-by-user"
                />
            )}
            {unrecognized.length > 0 && (
                <AccountHiddenTokensTable
                    account={account}
                    tokens={unrecognized}
                    heading={<Translation id="TR_TOKEN_UNRECOGNIZED_BY_TREZOR" />}
                    data-testid="@account-hidden-tokens/unrecognized"
                />
            )}
        </Column>
    );
};
