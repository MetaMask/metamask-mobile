import { checkForDeeplink } from '../../actions/user';
import Logger from '../../util/Logger';
import { AppStateEventProcessor } from '../AppStateEventListener';
import ReduxService from '../redux';
import SDKConnectV2 from '../SDKConnectV2';

export function handleDeeplink(opts: { uri?: string }) {
  // This is the earliest JS entry point for deeplinks. We must handle SDKConnectV2
  // links here immediately to establish the WebSocket connection as fast as possible,
  // without waiting for the app to be unlocked or fully onboarded.
  if (SDKConnectV2.isConnectDeeplink(opts.uri)) {
    SDKConnectV2.handleConnectDeeplink(opts.uri);
    // By returning here, we bypass the standard saga-based deeplink flow below,
    // which would otherwise wait for a LOGIN or ONBOARDING_COMPLETED action.
    // Those are also handled, but within the SDKConnectV2 logic.
    return;
  }

  const { dispatch } = ReduxService.store;
  const { uri } = opts;
  try {
    if (uri && typeof uri === 'string') {
      AppStateEventProcessor.setCurrentDeeplink(uri);
      dispatch(checkForDeeplink());
    }
  } catch (e) {
    Logger.error(e as Error, `Deeplink: Error parsing deeplink`);
  }
}
