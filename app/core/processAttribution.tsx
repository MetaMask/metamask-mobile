import extractURLParams from './DeeplinkManager/utils/extractURLParams';
import { RootState } from '../reducers';
import { Store } from 'redux';
import Logger from '../util/Logger';
import type { AnalyticsUnfilteredProperties } from '../util/analytics/analytics.types';

interface ProcessAttributionParams {
  currentDeeplink: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: Store<RootState, any>;
}

type AttributionResult = AnalyticsUnfilteredProperties & {
  attributionId?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};

export function processAttribution({
  currentDeeplink,
  store,
}: ProcessAttributionParams): AttributionResult | undefined {
  const { security } = store.getState();
  if (!security.dataCollectionForMarketing) {
    Logger.log(
      'processAttribution:: dataCollectionForMarketing is false, returning undefined',
    );
    return undefined;
  }

  if (currentDeeplink) {
    const { params } = extractURLParams(currentDeeplink);
    const {
      attributionId,
      attribution_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
    } = params;

    // Prefer camelCase attributionId; fall back to snake_case attribution_id
    // so URLs using either form are handled consistently.
    const resolvedAttributionId =
      attributionId?.trim() || attribution_id?.trim() || undefined;

    return {
      attributionId: resolvedAttributionId,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
    };
  }

  return undefined;
}
