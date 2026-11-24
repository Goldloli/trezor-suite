import { type ExchangeTrade, type ExchangeTradeQuoteRequest } from 'invity-api';

import { type TradingBridgeSpeed, type TradingBridgeSpeedFields } from '../../types';

export const getTradeBridgeSpeed = (
    trade: ExchangeTrade | undefined,
): TradingBridgeSpeed | undefined => {
    const bridgeTrade: (ExchangeTrade & TradingBridgeSpeedFields) | undefined = trade;

    return bridgeTrade?.bridgeSpeed;
};

type WithQuotesRequestBridgeSpeedParams = {
    request: ExchangeTradeQuoteRequest;
    bridgeSpeed: TradingBridgeSpeed;
};

export const withQuotesRequestBridgeSpeed = ({
    request,
    bridgeSpeed,
}: WithQuotesRequestBridgeSpeedParams): ExchangeTradeQuoteRequest => {
    const bridgeRequest: ExchangeTradeQuoteRequest & TradingBridgeSpeedFields = {
        ...request,
        bridgeSpeed,
    };

    return bridgeRequest;
};
