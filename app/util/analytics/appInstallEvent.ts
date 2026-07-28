import branch from 'react-native-branch';
import Logger from '../Logger';
import ReduxService from '../../core/redux';
import { MetaMetricsEvents } from '../../core/Analytics';
import { UserProfileProperty } from '../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import {
  selectAppInstallEventFired,
  selectExistingUser,
  selectPendingAppInstall,
} from '../../reducers/user/selectors';
import {
  clearPendingAppInstall,
  setAppInstallEventFired,
  setPendingAppInstall,
} from '../../actions/user';
import { AnalyticsEventBuilder } from './AnalyticsEventBuilder';
import { analytics } from './analytics';
import type { AnalyticsEventProperties } from '@metamask/analytics-controller';

/** Prevents parallel start() calls from double-capturing before Redux persists. */
let captureInFlight = false;
/** Prevents concurrent consent callbacks from emitting the event twice. */
let replayInFlight = false;

/**
 * Reads the deferred deeplink attribution for the install itself.
 *
 * `getFirstReferringParams` is required here rather than
 * `getLatestReferringParams`: the "first" variant returns the params of the
 * install and keeps returning them for the lifetime of that install, while the
 * "latest" variant returns the most recent session and is empty on a cold start
 * that has not finished Branch session initialisation yet.
 *
 * `+clicked_branch_link` is the same signal the Branch SDK itself uses to decide
 * whether a session came from a Branch link.
 */
const getInstallAttributionProperties = async (): Promise<
  AnalyticsEventProperties | undefined
> => {
  try {
    const params = await branch.getFirstReferringParams();

    if (params?.['+clicked_branch_link'] !== true) {
      return undefined;
    }

    const deeplinkPath = params?.$deeplink_path as string | undefined;

    return {
      install_source: 'deeplink',
      ...(deeplinkPath ? { deeplink_path: deeplinkPath } : {}),
    };
  } catch (error) {
    Logger.error(
      error as Error,
      'AppInstall: Error reading Branch install attribution',
    );
    return undefined;
  }
};

/**
 * Records a first install so the App Installed event can be emitted once the
 * user makes an analytics consent decision.
 *
 * This only captures state. Emitting here would be pointless: on a genuine
 * first launch the user has not consented yet, so both the event and the
 * install-date trait would be dropped by AnalyticsController.
 */
export async function captureAppInstallOnce(): Promise<void> {
  if (captureInFlight) {
    return;
  }

  captureInFlight = true;
  try {
    const state = ReduxService.store.getState();

    if (
      selectExistingUser(state) ||
      selectAppInstallEventFired(state) ||
      selectPendingAppInstall(state)
    ) {
      return;
    }

    // A device that is already opted in cannot be on its first launch, because
    // opting in requires the user to have completed the consent step on an
    // earlier launch. Reading consent here keeps this check in the same store
    // that gates emission, so losing the Redux `user` slice can no longer make
    // an existing install look brand new.
    if (analytics.isEnabled()) {
      return;
    }

    ReduxService.store.dispatch(
      setPendingAppInstall({
        installDate: new Date().toISOString().split('T')[0],
      }),
    );
  } catch (error) {
    Logger.error(
      error as Error,
      'AppInstall: Error capturing app install event',
    );
  } finally {
    captureInFlight = false;
  }
}

/**
 * Emits the App Installed event and install-date trait for an install captured
 * on an earlier launch. Must be called after analytics consent is granted, at
 * which point neither the event nor the trait is dropped.
 */
export async function replayPendingAppInstall(): Promise<void> {
  if (replayInFlight) {
    return;
  }

  replayInFlight = true;
  try {
    const state = ReduxService.store.getState();
    const pending = selectPendingAppInstall(state);

    if (!pending || selectAppInstallEventFired(state)) {
      return;
    }

    // Install date is the captured one, not today's: consent can be granted on
    // a later launch than the install.
    analytics.identify({
      [UserProfileProperty.INSTALL_DATE_MOBILE]: pending.installDate,
    });

    const eventBuilder = AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.APP_INSTALLED,
    );

    const attributionProperties = await getInstallAttributionProperties();
    if (attributionProperties) {
      eventBuilder.addProperties(attributionProperties);
    }

    analytics.trackEvent(eventBuilder.build());

    // Only mark terminal once the event has actually been handed over while
    // consent is live, so a throw above leaves the install pending for retry.
    ReduxService.store.dispatch(setAppInstallEventFired());
    ReduxService.store.dispatch(clearPendingAppInstall());
  } catch (error) {
    Logger.error(
      error as Error,
      'AppInstall: Error replaying app install event',
    );
  } finally {
    replayInFlight = false;
  }
}

/**
 * Drops a pending install when the user declines analytics, mirroring how
 * buffered onboarding events and buffered traces are discarded on opt-out.
 */
export function discardPendingAppInstall(): void {
  try {
    ReduxService.store.dispatch(clearPendingAppInstall());
  } catch (error) {
    Logger.error(
      error as Error,
      'AppInstall: Error discarding pending app install',
    );
  }
}
