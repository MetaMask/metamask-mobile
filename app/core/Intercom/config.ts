import {
  IntercomConfig,
  IntercomFeatureFlags,
  DEFAULT_INTERCOM_FLAGS,
} from './types';

/**
 * Get Intercom configuration from environment variables
 *
 * Required environment variables:
 * - INTERCOM_APP_ID: App ID from Intercom workspace
 * - INTERCOM_IOS_API_KEY: iOS API Key (starts with ios_sdk-)
 * - INTERCOM_ANDROID_API_KEY: Android API Key (starts with android_sdk-)
 */
export function getIntercomConfig(): IntercomConfig {
  const appId = process.env.INTERCOM_APP_ID ?? '';
  const iosApiKey = process.env.INTERCOM_IOS_API_KEY ?? '';
  const androidApiKey = process.env.INTERCOM_ANDROID_API_KEY ?? '';

  // Log warning if config is missing (but don't throw - allow graceful fallback)
  if (!appId || !iosApiKey || !androidApiKey) {
    console.warn(
      'IntercomConfig: Missing environment variables. Set INTERCOM_APP_ID, INTERCOM_IOS_API_KEY, and INTERCOM_ANDROID_API_KEY',
    );
  }

  return {
    appId,
    iosApiKey,
    androidApiKey,
  };
}

/**
 * Check if Intercom is configured
 */
export function isIntercomConfigured(): boolean {
  const config = getIntercomConfig();
  return Boolean(config.appId && (config.iosApiKey || config.androidApiKey));
}

/**
 * Get Intercom feature flags from remote config
 *
 * TODO: Integrate with existing remote config system
 * For now, returns defaults with feature flags disabled for safety
 */
export async function getIntercomFeatureFlags(): Promise<IntercomFeatureFlags> {
  try {
    // TODO: Fetch from remote config system
    // Example integration point:
    // const remoteFlags = await RemoteConfig.getIntercomFlags();
    // return { ...DEFAULT_INTERCOM_FLAGS, ...remoteFlags };

    return DEFAULT_INTERCOM_FLAGS;
  } catch (error) {
    console.warn(
      'IntercomConfig: Failed to fetch feature flags, using defaults',
    );
    return DEFAULT_INTERCOM_FLAGS;
  }
}

/**
 * Check if Intercom features are enabled
 */
export async function isIntercomEnabled(): Promise<{
  surveys: boolean;
  support: boolean;
}> {
  const flags = await getIntercomFeatureFlags();

  return {
    surveys: flags.surveys_enabled_mobile && !flags.kill_switch,
    support: flags.support_enabled_mobile && !flags.kill_switch,
  };
}
