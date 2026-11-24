import { useState } from 'react';
import { useSelector } from 'react-redux';

import { Translation } from '@suite/intl';
import {
    TRADING_BRIDGE_SPEEDS,
    type TradingBridgeSpeed,
    selectTradingExchangeQuotesRequest,
    tradingExchangeActions,
    withQuotesRequestBridgeSpeed,
} from '@suite-common/trading';
import { Banner, Column, Icon, Modal, RadioCard, Row, Spinner, Text } from '@trezor/components';
import { useServices } from '@trezor/dependency-injection';
import { useAsyncClickHandler } from '@trezor/react-utils';
import { injectDispatch } from '@trezor/redux-utils';

import { useTradingExchangeTradeActions } from '#src/hooks/wallet/trading/useTradingExchangeTradeActions';

import { BRIDGE_SPEED_OPTIONS } from './bridgeSpeedOptions';

type TradingExchangeBridgeSpeedModalProps = {
    bridgeSpeed: TradingBridgeSpeed;
    receiveSymbol?: string;
    onClose: () => void;
};

export const TradingExchangeBridgeSpeedModal = ({
    bridgeSpeed: currentBridgeSpeed,
    receiveSymbol,
    onClose,
}: TradingExchangeBridgeSpeedModalProps) => {
    const { dispatch } = useServices(injectDispatch);
    const quotesRequest = useSelector(selectTradingExchangeQuotesRequest);
    const [pendingBridgeSpeed, setPendingBridgeSpeed] = useState<TradingBridgeSpeed>();
    const [hasSubmitError, setHasSubmitError] = useState(false);
    const { handleClick, disabled: isSubmitting } = useAsyncClickHandler();
    const { refreshSelectedQuote } = useTradingExchangeTradeActions();

    const applyBridgeSpeed = async (bridgeSpeed: TradingBridgeSpeed) => {
        if (bridgeSpeed === currentBridgeSpeed) {
            onClose();

            return;
        }

        if (!quotesRequest) {
            setHasSubmitError(true);

            return;
        }
        setHasSubmitError(false);
        setPendingBridgeSpeed(bridgeSpeed);

        dispatch(
            tradingExchangeActions.saveQuoteRequest(
                withQuotesRequestBridgeSpeed({ request: quotesRequest, bridgeSpeed }),
            ),
        );
        const isConfirmed = await refreshSelectedQuote();
        setPendingBridgeSpeed(undefined);

        if (isConfirmed) {
            onClose();

            return;
        }

        dispatch(tradingExchangeActions.saveQuoteRequest(quotesRequest));
        setHasSubmitError(true);
    };

    const onCloseModal = () => {
        if (isSubmitting) {
            return;
        }
        onClose();
    };

    return (
        <Modal
            heading={<Translation id="TR_TRADING_BRIDGE_SPEED" />}
            onCancel={onCloseModal}
            width={400}
        >
            <Column gap={8}>
                {TRADING_BRIDGE_SPEEDS.map(bridgeSpeed => {
                    const { nameId, descriptionId, icon } = BRIDGE_SPEED_OPTIONS[bridgeSpeed];

                    return (
                        <RadioCard
                            key={bridgeSpeed}
                            type="raised"
                            isSelected={bridgeSpeed === currentBridgeSpeed}
                            isDisabled={isSubmitting}
                            onClick={() => handleClick(() => applyBridgeSpeed(bridgeSpeed))}
                            dataTestId={`@trading/bridge-speed-modal/${bridgeSpeed}`}
                        >
                            <Column gap={4} alignItems="stretch">
                                <Row justifyContent="space-between" alignItems="center" gap={8}>
                                    <Row alignItems="center" gap={8}>
                                        <Icon as={icon} size={16} />
                                        <Text typographyStyle="body-md-strong">
                                            <Translation id={nameId} />
                                        </Text>
                                    </Row>
                                    {bridgeSpeed === pendingBridgeSpeed && (
                                        <Spinner size={16} isDisabled />
                                    )}
                                </Row>
                                <Text
                                    typographyStyle="body-sm"
                                    intent="neutral"
                                    priority="secondary"
                                >
                                    <Translation
                                        id={descriptionId}
                                        values={{ symbol: receiveSymbol }}
                                    />
                                </Text>
                            </Column>
                        </RadioCard>
                    );
                })}

                {hasSubmitError && (
                    <Banner
                        intent="critical"
                        icon
                        data-testid="@trading/bridge-speed-modal/error"
                        description={<Translation id="TR_TRADING_BRIDGE_SPEED_ERROR" />}
                    />
                )}
            </Column>
        </Modal>
    );
};
