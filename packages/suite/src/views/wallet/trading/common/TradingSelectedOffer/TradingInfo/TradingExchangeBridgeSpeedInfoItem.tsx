import { useState } from 'react';

import { type CryptoId } from 'invity-api';

import { Translation } from '@suite/intl';
import { type TradingBridgeSpeed, useTradingUtils } from '@suite-common/trading';
import { getDisplaySymbol } from '@suite-common/wallet-config';
import { InfoItem, Text, TextButton, Tooltip } from '@trezor/components';
import { PencilSimpleIcon } from '@trezor/icons';

import { TradingExchangeBridgeSpeedModal } from '#src/views/wallet/trading/exchange/TradingExchangeBridgeSpeedModal/TradingExchangeBridgeSpeedModal';
import { BRIDGE_SPEED_OPTIONS } from '#src/views/wallet/trading/exchange/TradingExchangeBridgeSpeedModal/bridgeSpeedOptions';

type TradingExchangeBridgeSpeedInfoItemProps = {
    isEditable?: boolean;
    bridgeSpeed: TradingBridgeSpeed;
    receiveCryptoId: CryptoId | undefined;
};

export const TradingExchangeBridgeSpeedInfoItem = ({
    isEditable = false,
    bridgeSpeed,
    receiveCryptoId,
}: TradingExchangeBridgeSpeedInfoItemProps) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const { cryptoIdToSymbolAndContractAddress } = useTradingUtils();

    const { coinSymbol, contractAddress } = cryptoIdToSymbolAndContractAddress(receiveCryptoId);
    const receiveSymbol = coinSymbol ? getDisplaySymbol(coinSymbol, contractAddress) : undefined;

    return (
        <>
            <InfoItem
                label={
                    <Tooltip content={<Translation id="TR_TRADING_BRIDGE_SPEED_INFO" />} hasIcon>
                        <Translation id="TR_TRADING_BRIDGE_SPEED" />
                    </Tooltip>
                }
                direction="row"
            >
                {isEditable ? (
                    <TextButton
                        onClick={() => setIsEditModalOpen(true)}
                        size="small"
                        iconRight={PencilSimpleIcon}
                        intent="brand"
                        isUnderlined
                        data-testid="@trading/offer/info/bridge-speed"
                    >
                        <Translation id={BRIDGE_SPEED_OPTIONS[bridgeSpeed].nameId} />
                    </TextButton>
                ) : (
                    <Text typographyStyle="body-sm" data-testid="@trading/offer/info/bridge-speed">
                        <Translation id={BRIDGE_SPEED_OPTIONS[bridgeSpeed].nameId} />
                    </Text>
                )}
            </InfoItem>

            {isEditModalOpen && (
                <TradingExchangeBridgeSpeedModal
                    bridgeSpeed={bridgeSpeed}
                    receiveSymbol={receiveSymbol}
                    onClose={() => setIsEditModalOpen(false)}
                />
            )}
        </>
    );
};
