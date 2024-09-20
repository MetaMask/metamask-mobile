import { store } from '../store';
import extractURLParams from './DeeplinkManager/ParseManager/extractURLParams';

export function processAttribution(currentDeeplink: string | null): string | undefined {
  const state = store.getState();
  const isMarketingEnabled = state.security.dataCollectionForMarketing;

  if (isMarketingEnabled && currentDeeplink) {
    const { params } = extractURLParams(currentDeeplink);
    return params.attributionId;
  }

  return undefined;
}
