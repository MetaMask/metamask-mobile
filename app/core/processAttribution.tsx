import { store } from '../store';
import extractURLParams from './DeeplinkManager/ParseManager/extractURLParams';

export function processAttribution(currentDeeplink: string | null): string | undefined {
  try {
    const state = store.getState();
    const isMarketingEnabled = state.security.dataCollectionForMarketing;

    if (isMarketingEnabled && currentDeeplink) {
      const { params } = extractURLParams(currentDeeplink);
      return params.attributionId ?? undefined;
    }
  } catch (error) {
    console.error(`processAttribution error for ${currentDeeplink}`, error);
  }

  return undefined;
}
