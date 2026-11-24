import DevLogger from '../../../SDKConnect/utils/DevLogger';
import ReduxService from '../../../redux';
import type { DeeplinkIntent } from '../../types/DeeplinkIntent';
import { executeDeeplinkIntent } from '../../utils/executeDeeplinkIntent';

interface HandlePredictUrlParams {
  predictPath: string;
  origin?: string;
}

/**
 * Predict deeplink handler: a thin parser into Predict intents (PRED-1411).
 *
 * Predict owns the link vocabulary, the Venue rules and the destination
 * (`parsePredictLink`, `resolvePredictLinkFromStore` on the PredictNext entry
 * point). This handler only wraps the result as a `DeeplinkIntent`. The entry
 * point is loaded lazily: this module is reachable from Engine init, and the
 * entry point loads the Predict UI.
 *
 * V1 links (`/predict`, `?market=23246`, `?marketId=23246`, `?tab=crypto`,
 * `?q=bitcoin`, `?feed=sports&tab=all&filter=live`) are Polymarket-origin,
 * whichever Venue is active. Venue-marked links: `?venue=kalshi`,
 * `?venue=kalshi&event=<ticker>`,
 * `?venue=kalshi&feed=sports-football-nfl&tab=games`, and
 * `?venue=polymarket&market=23246` (or `&event=23246`).
 *
 * A link marked for a Venue that is not the Active Venue, an unknown Venue,
 * or an entity the Active Venue cannot open lands on Predict's "Market
 * unavailable" sheet. It never opens another Event, a feed, Home or another
 * Venue.
 *
 * Attribution: the entry point is `origin` (default `deeplink`) with
 * `_<utm_source>` appended, e.g. `deeplink_twitter`, on every destination.
 */
export const createPredictDeeplinkIntent = async ({
  predictPath,
  origin,
}: HandlePredictUrlParams): Promise<DeeplinkIntent> => {
  const { parsePredictLink, resolvePredictLinkFromStore } = await import(
    '../../../../components/UI/PredictNext'
  );
  const link = parsePredictLink({ predictPath, origin });
  DevLogger.log('[handlePredictUrl] Parsed link:', link);
  const resolution = await resolvePredictLinkFromStore(
    link,
    ReduxService.store,
  );
  DevLogger.log('[handlePredictUrl] Resolution:', resolution);
  return {
    target: {
      type: 'main-stack',
      routeName: resolution.navigation.routeName,
      params: resolution.navigation.params,
    },
  };
};

export const handlePredictUrl = async ({
  predictPath,
  origin,
}: HandlePredictUrlParams) => {
  DevLogger.log(
    '[handlePredictUrl] Starting predict deeplink handling with path:',
    predictPath,
    'origin:',
    origin,
  );

  try {
    await executeDeeplinkIntent(
      await createPredictDeeplinkIntent({ predictPath, origin }),
    );
  } catch (error) {
    // No fallback destination: a link that fails opens nothing rather than
    // another screen.
    DevLogger.log('Failed to handle predict deeplink:', error);
  }
};
