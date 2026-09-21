import Engine from '../../../../../core/Engine';
import packageJSON from '../../../../../../package.json';
import { PredictApiReadClient } from './PredictApiReadClient';
import { KalshiRemoteAdapter } from './KalshiRemoteAdapter';

/**
 * Builds a trading-capable Kalshi remote adapter for the Order flow. This is
 * the UI composition seam for the Order Flow sheet: the Engine-registered
 * data services share cached reads, while preview requests are single-flight
 * workflow calls that must bypass the shared query cache. When trading grows
 * into the placement slice, this composition moves to the Engine graph.
 */
export const createKalshiTradingAdapter = (): KalshiRemoteAdapter =>
  new KalshiRemoteAdapter(
    new PredictApiReadClient({
      baseUrl: process.env.MM_PREDICT_API_URL,
      clientVersion: packageJSON.version,
      getBearerToken: () =>
        Engine.context.AuthenticationController.getBearerToken(),
    }),
  );
