import { getVersion } from 'react-native-device-info';
import { formatAnalyticsAppVersion } from '../../../../util/metrics/getAnalyticsAppVersion';

/**
 * Analytics app version for Social events. Read once. A missing or non-string
 * native version omits the property rather than failing the event.
 */
let socialAppBuild: string | undefined;
let socialAppBuildRead = false;

export const readSocialAppBuild = (): string | undefined => {
  if (!socialAppBuildRead) {
    socialAppBuildRead = true;
    try {
      const version: unknown = getVersion();
      if (typeof version === 'string' && version.length > 0) {
        const build = formatAnalyticsAppVersion(
          version,
          process.env.METAMASK_ENVIRONMENT,
          process.env.METAMASK_BUILD_ATTRIBUTION,
        );
        socialAppBuild = build || undefined;
      } else {
        socialAppBuild = undefined;
      }
    } catch {
      socialAppBuild = undefined;
    }
  }
  return socialAppBuild;
};

export const withSocialAppBuild = <T extends object>(properties: T): T => {
  const app_build = readSocialAppBuild();
  return app_build ? { ...properties, app_build } : properties;
};
