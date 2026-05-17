import Braze, { Banner } from '@braze/react-native-sdk';
import I18n, { I18nEvents } from '../../../locales/i18n';
import Logger from '../../util/Logger';
import { isE2E } from '../../util/test/utils';
import Engine from '../Engine/Engine';
import { BrazePlugin } from '../Engine/controllers/analytics-controller/BrazePlugin';
import { ALL_BRAZE_BANNER_PLACEMENT_IDS } from './constants';

let brazePlugin: BrazePlugin | undefined;

/**
 * Get or create the singleton BrazePlugin instance.
 * This should be called during analytics controller initialization to pass
 * the plugin to the platform adapter.
 *
 * On first creation, sets the current language and subscribes to locale
 * changes so the Braze language stays in sync.
 */
export function getBrazePlugin(): BrazePlugin {
  if (!brazePlugin) {
    brazePlugin = new BrazePlugin();
    brazePlugin.setLanguage(I18n.locale);
    I18nEvents.addListener('localeChanged', (locale: string) => {
      brazePlugin?.setLanguage(locale);
    });
  }
  return brazePlugin;
}

/**
 * Resolve the profile ID from the current session and forward it to the
 * Braze Segment plugin so all subsequent identify / track / flush calls
 * are attributed to this identity.
 *
 * Skipped during E2E so CI does not create Braze profiles from mocked
 * identity sessions.
 */
export async function setBrazeUser(): Promise<void> {
  if (isE2E) {
    return;
  }

  try {
    const { AuthenticationController } = Engine.context;
    const sessionProfile = await AuthenticationController.getSessionProfile();
    if (sessionProfile?.profileId) {
      getBrazePlugin().setBrazeProfileId(sessionProfile.profileId);
    }
  } catch (error) {
    Logger.error(error as Error, '[Braze] Failed to set Braze user');
  }
}

/**
 * Clear the Braze profile identity so the plugin becomes a no-op.
 * Call on sign-out to stop attributing events to the previous user.
 */
export function clearBrazeUser(): void {
  if (isE2E) {
    return;
  }

  getBrazePlugin().setBrazeProfileId(undefined);
  Logger.log('[Braze] Cleared Braze user identity');
}

/**
 * Retrieve the cached banner for a placement without throwing.
 * Returns `null` when no banner is cached or if the SDK call fails.
 */
export async function getBannerForPlacement(
  placementId: string,
): Promise<Banner | null> {
  try {
    return await Braze.getBanner(placementId);
  } catch (error) {
    Logger.error(error as Error, '[Braze] Failed to get banner for placement');
    return null;
  }
}

/**
 * Request a fresh banner from the SDK for the given placements.
 * Defaults to the standard banner placement when no IDs are supplied.
 * Call this after dismissal or on app foreground to ensure the next
 * campaign is fetched and cached.
 */
export function refreshBrazeBanners(
  placementIds: string[] = ALL_BRAZE_BANNER_PLACEMENT_IDS,
): void {
  try {
    Braze.requestBannersRefresh(placementIds);
    Logger.log('[Braze] Requested banner refresh');
  } catch (error) {
    Logger.error(error as Error, '[Braze] Failed to refresh banners');
  }
}

/**
 * Log a `Banner Dismissed` custom event with the supplied properties and flush immediately.
 */
export function dismissBrazeBanner(properties: {
  [key: string]: unknown;
}): void {
  try {
    Logger.log('[Braze] Dismissing banner', properties);
    Braze.logCustomEvent('Banner Dismissed', properties);
    Braze.requestImmediateDataFlush();
  } catch (error) {
    Logger.error(error as Error, '[Braze] Failed to log banner dismissal');
  }
}

/**
 * Log a Braze banner impression and a corresponding `Banner Impression`
 * custom event with the supplied properties.
 *
 * Pass `null` when there are no extra properties to attach (e.g. the banner
 * has no `banner_id`). The SDK `logBannerImpression` call always fires;
 * `logCustomEvent` is skipped when `properties` is null.
 */
export function logBrazeBannerImpression(
  placementId: string,
  properties: { [key: string]: unknown } | null,
): void {
  try {
    Braze.logBannerImpression(placementId);

    if (properties) {
      Braze.logCustomEvent('Banner Impression', properties);
    }
  } catch (error) {
    Logger.error(error as Error, '[Braze] Failed to log banner impression');
  }
}

/**
 * Log a Braze banner click
 */
export function logBrazeBannerClick(placementId: string): void {
  try {
    Braze.logBannerClick(placementId, null);
  } catch (error) {
    Logger.error(error as Error, '[Braze] Failed to log banner click');
  }
}

/**
 * Reset the BrazePlugin singleton for testing.
 * This ensures each test gets a fresh plugin instance.
 *
 * @internal Test helper only — do not use in production code.
 */
export function resetBrazePluginForTesting(): void {
  brazePlugin = undefined;
}
