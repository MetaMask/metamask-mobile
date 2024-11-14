import extractURLParams from './DeeplinkManager/ParseManager/extractURLParams';
import { RootState } from '../reducers';
import { Store } from 'redux';
import Logger from '../util/Logger';
import DevLogger from './SDKConnect/utils/DevLogger';

interface ProcessAttributionParams {
    currentDeeplink: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: Store<RootState, any>;
}

interface AttributionResult {
  attributionId?: string;
  utm?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export function processAttribution({ currentDeeplink, store }: ProcessAttributionParams): AttributionResult | undefined {
    const { security } = store.getState();
    if (!security.dataCollectionForMarketing) {
        return undefined;
    }

    if (currentDeeplink) {
        const { params } = extractURLParams(currentDeeplink);
        const attributionId = params.attributionId || undefined;
        const utm = params.utm || undefined;
        let utm_source, utm_medium, utm_campaign, utm_term, utm_content;

        if (utm) {
            try {
                const utmParams = JSON.parse(utm);
                DevLogger.log('processAttribution:: UTM params', utmParams);
                utm_source = utmParams.source;
                utm_medium = utmParams.medium;
                utm_campaign = utmParams.campaign;
                utm_term = utmParams.term;
                utm_content = utmParams.content;
            } catch (error) {
                Logger.error(new Error('Error parsing UTM params'), error);
            }
        }

        return {
            attributionId,
            utm,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_term,
            utm_content
        };
    }

    return undefined;
}
