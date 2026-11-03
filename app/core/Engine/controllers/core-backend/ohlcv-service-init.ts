import { OHLCVService, OHLCVServiceMessenger } from '@metamask/core-backend';
import { OHLCV_SUBSCRIPTION_NAMESPACE } from '../../../../constants/ohlcv';
import { MessengerClientInitFunction } from '../../types';
import { trace } from '../../../../util/trace';
import Logger from '../../../../util/Logger';

/**
 * Initialize the OHLCV service for real-time candlestick streaming.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const ohlcvServiceInit: MessengerClientInitFunction<
  OHLCVService,
  OHLCVServiceMessenger
> = ({ controllerMessenger }) => {
  Logger.log('Initializing OHLCVService');

  const controller = new OHLCVService({
    messenger: controllerMessenger,
    subscriptionNamespace: OHLCV_SUBSCRIPTION_NAMESPACE,
    // @ts-expect-error: Types of `TraceRequest` are not the same.
    traceFn: trace,
  });

  controller.init();

  Logger.log('OHLCVService initialized');

  return {
    controller,
  };
};
