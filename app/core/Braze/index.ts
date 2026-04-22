import Braze from '@braze/react-native-sdk';
import I18n, { I18nEvents } from '../../../locales/i18n';
import Logger from '../../util/Logger';
import { isE2E } from '../../util/test/utils';
import Engine from '../Engine/Engine';
import { BrazePlugin } from '../Engine/controllers/analytics-controller/BrazePlugin';
import { BRAZE_BANNER_PLACEMENT_ID } from './constants';

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
      Logger.log('[Braze] Identified user with profileId');
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
 * Reset the BrazePlugin singleton for testing.
 * This ensures each test gets a fresh plugin instance.
 *
 * @internal Test helper only — do not use in production code.
 */
export function resetBrazePluginForTesting(): void {
  brazePlugin = undefined;
}
