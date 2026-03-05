import { checkForDeeplink } from '../../../../actions/user';
import Logger from '../../../../util/Logger';
import { AppStateEventProcessor } from '../../../AppStateEventListener';
import ReduxService from '../../../redux';
import SDKConnectV2 from '../../../SDKConnectV2';
import AppConstants from '../../../AppConstants';

/**
 * Dev-only URL prefix to simulate Branch webpage fallback (e.g. X in-app browser)
 * in the simulator. When the app receives e.g. metamask://__branch_fallback__/trending,
 * we rewrite it to https://link.metamask.io/trending so the full deeplink flow runs
 * without needing Branch or X.
 */
const BRANCH_FALLBACK_SIMULATION_PREFIX = 'metamask://__branch_fallback__/';

export function handleDeeplink(opts: { uri?: string; source?: string }) {
  // This is the earliest JS entry point for deeplinks. We must handle SDKConnectV2
  // links here immediately to establish the WebSocket connection as fast as possible,
  // without waiting for the app to be unlocked or fully onboarded.
  if (SDKConnectV2.isMwpDeeplink(opts.uri)) {
    SDKConnectV2.handleMwpDeeplink(opts.uri);
    // By returning here, we bypass the standard saga-based deeplink flow below,
    // which would otherwise wait for a LOGIN or ONBOARDING_COMPLETED action.
    // Those are also handled, but within the SDKConnectV2 logic.
    return;
  }

  let uri = opts.uri;
  const source = opts.source;

  Logger.log(
    `[DeeplinkDebug] handleDeeplink: incoming uri=${JSON.stringify(uri)} __DEV__=${__DEV__}`,
  );

  // Dev-only: simulate Branch webpage fallback in simulator (no Branch/X required)
  if (
    __DEV__ &&
    uri &&
    typeof uri === 'string' &&
    uri.startsWith(BRANCH_FALLBACK_SIMULATION_PREFIX)
  ) {
    const path = uri.slice(BRANCH_FALLBACK_SIMULATION_PREFIX.length).trim();
    if (path) {
      uri = `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${path}`;
      Logger.log(
        `[DeeplinkDebug] handleDeeplink: rewrote simulation → uri=${uri}`,
      );
    }
  }

  const { dispatch } = ReduxService.store;
  try {
    if (uri && typeof uri === 'string') {
      Logger.log(
        `[DeeplinkDebug] handleDeeplink: setCurrentDeeplink(uri=${uri})`,
      );
      AppStateEventProcessor.setCurrentDeeplink(uri, source);
      dispatch(checkForDeeplink());
    }
  } catch (e) {
    Logger.error(e as Error, `Deeplink: Error parsing deeplink`);
  }
}
