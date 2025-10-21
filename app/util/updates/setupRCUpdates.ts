import { setUpdateURLAndRequestHeadersOverride } from 'expo-updates';
import Logger from '../Logger';

/**
 * Sets up EAS Updates channel override for RC builds.
 *
 * By default, all builds point to the 'production' channel.
 * For RC builds, we override to the 'preview' channel at runtime
 * so they receive preview updates without needing a separate build.
 *
 * Production builds will continue to use the 'production' channel.
 *
 * This should be called early in the app lifecycle, before any update checks.
 */
export function setupRCUpdates() {
  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;

  // Only override for RC builds
  if (metamaskEnvironment !== 'production') {
    try {
      setUpdateURLAndRequestHeadersOverride({
        requestHeaders: {
          'expo-channel-name': 'preview',
        },
        updateUrl: 'https://u.expo.dev/fddf3e54-a014-4ba7-a695-d116a9ef9620',
      });
      Logger.log('EAS Updates: Overriding to preview channel for RC build');
    } catch (error) {
      Logger.error(
        error as Error,
        'Failed to set update channel override for RC',
      );
    }
  } else {
    Logger.log(
      `EAS Updates: Using default production channel (env: ${metamaskEnvironment})`,
    );
  }
}
