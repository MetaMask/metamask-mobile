import extractURLParams from './DeeplinkManager/ParseManager/extractURLParams';
import { RootState } from '../reducers';
import { Store } from 'redux';

interface ProcessAttributionParams {
    currentDeeplink: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: Store<RootState, any>;
}

export function processAttribution({ currentDeeplink, store }: ProcessAttributionParams): { attributionId?: string, utm?: string } {
    const state = store.getState();
    const isMarketingEnabled = state.security.dataCollectionForMarketing;

    if (isMarketingEnabled && currentDeeplink) {
        const { params } = extractURLParams(currentDeeplink);
        // Force undefined to be returned as extractUrlParams default to empty string on error.
        return { attributionId: params.attributionId || undefined, utm: params.utm || undefined };
    }

    return { attributionId: undefined, utm: undefined };
}
