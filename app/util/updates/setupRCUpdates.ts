import { setUpdateURLAndRequestHeadersOverride } from 'expo-updates';
import Logger from '../Logger';

// Track the active channel after runtime override
// Note: Updates.channel constant always shows embedded native value, not the runtime override
let activeChannel: string = 'production'; // Default matches native config

/**
 * Sets up EAS Updates channel override for non-production builds.
 *
 * By default, all builds point to the 'production' channel (embedded in native config).
 * For non-production builds (rc, dev, beta, etc.), we override to the 'preview' channel at runtime
 * so they receive preview updates without needing a separate build.
 *
 * Production builds will continue to use the 'production' channel.
 *
 * This should be called early in the app lifecycle, before any update checks.
 */
export function setupRCUpdates() {
  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;

  // Override for all non-production builds
  if (metamaskEnvironment !== 'production') {
    try {
      setUpdateURLAndRequestHeadersOverride({
        requestHeaders: {
          'expo-channel-name': 'preview',
        },
        updateUrl: 'https://u.expo.dev/fddf3e54-a014-4ba7-a695-d116a9ef9620',
      });
      activeChannel = 'preview';
      Logger.log(
        `EAS Updates: Overriding to preview channel (env: ${metamaskEnvironment})`,
      );
    } catch (error) {
      activeChannel = 'production'; // Fallback on error
      Logger.error(
        error as Error,
        'Failed to set update channel override for RC',
      );
    }
  } else {
    activeChannel = 'production';
    Logger.log(
      `EAS Updates: Using default production channel (env: ${metamaskEnvironment})`,
    );
  }
}

/**
 * Gets the active update channel after any runtime overrides.
 *
 * Note: The Updates.channel constant from expo-updates always shows the embedded
 * native value and does NOT reflect runtime overrides. Use this function instead
 * to get the actual active channel.
 *
 * @returns The currently active channel ('production' or 'preview')
 */
export function getActiveUpdateChannel(): string {
  return activeChannel;
}
