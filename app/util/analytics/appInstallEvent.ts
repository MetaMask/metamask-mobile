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
import type { PendingAppInstallAttribution } from '../../reducers/user/types';

/** Prevents parallel start() calls from double-capturing before Redux persists. */
let captureInFlight = false;
/** Prevents concurrent consent callbacks from emitting the event twice. */
let replayInFlight = false;

/**
 * Returns the trimmed value when it is a non-empty string, otherwise undefined.
 *
 * Branch params are untyped native data: keys can be missing, `null`, empty,
 * or of an unexpected type. Normalising here keeps every optional field
 * handled the same way, so no empty strings end up persisted or emitted.
 */
const readNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * Reads Branch attribution at install time using getLatestReferringParams.
 *
 * We intentionally use getLatestReferringParams here (not getFirstReferringParams)
 * because branch.subscribe does not fire on iOS cold start after the new RN
 * architecture upgrade. getFirstReferringParams is populated via the subscribe
 * callback, so it stays empty when subscribe never fires. getLatestReferringParams
 * reads the native session directly and works regardless of subscribe.
 *
 * This is called at capture time (first launch = install session), so
 * getLatestReferringParams returns install-session params. The result is stored
 * in Redux so replay on a later launch uses the captured data rather than
 * calling getLatestReferringParams again (which would return a different session).
 *
 * Accepts both direct-tap (+clicked_branch_link: true) and NativeLink/pasteboard
 * (+clicked_branch_link: false, $deeplink_path present) attribution.
 *
 * UTM values are read from the link's Branch Analytics Tags, using Branch's
 * documented UTM mapping: `~channel` -> utm_source, `~feature` -> utm_medium,
 * `~campaign` -> utm_campaign. These tags are only exposed through the SDK and
 * are never part of the referring link, so they are stored separately rather
 * than merged into the deeplink path. Branch has no Analytics Tag mapped to
 * utm_term or utm_content, so those are not captured.
 *
 * Optional fields are omitted when missing, empty, or not a string.
 */
const readBranchAttributionAtInstall = async (): Promise<
  PendingAppInstallAttribution | undefined
> => {
  try {
    const params = await branch.getLatestReferringParams();

    if (!params) {
      return undefined;
    }

    const clickedBranchLink = params['+clicked_branch_link'] === true;
    const deeplinkPath = readNonEmptyString(params.$deeplink_path);

    if (!clickedBranchLink && !deeplinkPath) {
      return undefined;
    }

    const referringLink = readNonEmptyString(params['~referring_link']);
    const utmSource = readNonEmptyString(params['~channel']);
    const utmMedium = readNonEmptyString(params['~feature']);
    const utmCampaign = readNonEmptyString(params['~campaign']);

    return {
      clickedBranchLink,
      ...(deeplinkPath ? { deeplinkPath } : {}),
      ...(referringLink ? { referringLink } : {}),
      ...(utmSource ? { utmSource } : {}),
      ...(utmMedium ? { utmMedium } : {}),
      ...(utmCampaign ? { utmCampaign } : {}),
    };
  } catch (error) {
    Logger.error(
      error as Error,
      'AppInstall: Error reading Branch attribution at install',
    );
    return undefined;
  }
};

/**
 * Builds the App Installed attribution properties from Branch's deferred
 * attribution captured at install time.
 *
 * Payload shape mirrors extension (the source of truth for this event):
 * `install_source: 'deeplink'` plus `deeplink_path` carrying the full
 * referring link URL (extension sources it from the metamask.io
 * `deferred_deeplink` cookie). Branch's short `$deeplink_path` is only used
 * when no full URL is available.
 *
 * `utm_source`, `utm_medium` and `utm_campaign` come from Branch Analytics
 * Tags and are only included when they were captured at install time.
 */
const attributionToEventProperties = (
  attribution: PendingAppInstallAttribution,
): AnalyticsEventProperties => {
  const { referringLink, utmSource, utmMedium, utmCampaign } = attribution;
  const deeplinkPath = referringLink ?? attribution.deeplinkPath;

  return {
    install_source: 'deeplink',
    ...(deeplinkPath ? { deeplink_path: deeplinkPath } : {}),
    ...(utmSource ? { utm_source: utmSource } : {}),
    ...(utmMedium ? { utm_medium: utmMedium } : {}),
    ...(utmCampaign ? { utm_campaign: utmCampaign } : {}),
  };
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

    if (selectExistingUser(state)) {
      return;
    }
    if (selectAppInstallEventFired(state)) {
      return;
    }
    if (selectPendingAppInstall(state)) {
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

    const branchAttribution = await readBranchAttributionAtInstall();

    const pendingPayload = {
      installDate: new Date().toISOString().split('T')[0],
      ...(branchAttribution ? { branchAttribution } : {}),
    };

    ReduxService.store.dispatch(setPendingAppInstall(pendingPayload));
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

    if (pending.branchAttribution) {
      eventBuilder.addProperties(
        attributionToEventProperties(pending.branchAttribution),
      );
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
