import extractURLParams from './DeeplinkManager/utils/extractURLParams';
import { RootState } from '../reducers';
import { Store } from 'redux';
import Logger from '../util/Logger';

interface ProcessAttributionParams {
  currentDeeplink: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: Store<RootState, any>;
}

interface AttributionResult {
  attributionId?: string;

  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

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
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
    } = params;

    return {
      attributionId,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
    };
  }

  return undefined;
}
