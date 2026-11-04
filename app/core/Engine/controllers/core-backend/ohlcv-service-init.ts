import { OHLCVService, OHLCVServiceMessenger } from '@metamask/core-backend';
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
    // core-backend 14 defaults to `ohlcv.v1`; keep `market-data.v1` until the
    // client channel matching (charts, bridge live rates, social spot prices)
    // moves to `ohlcv.v1`.
    subscriptionNamespace: 'market-data.v1',
    // @ts-expect-error: Types of `TraceRequest` are not the same.
    traceFn: trace,
  });

  controller.init();

  Logger.log('OHLCVService initialized');

  return {
    controller,
  };
};
