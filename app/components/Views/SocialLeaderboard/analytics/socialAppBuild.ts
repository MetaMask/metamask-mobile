import { getVersion } from 'react-native-device-info';
import { formatAnalyticsAppVersion } from '../../../../util/metrics/getAnalyticsAppVersion';
let socialAppBuild: string | undefined;
let socialAppBuildRead = false;

export const readSocialAppBuild = (): string | undefined => {
  if (socialAppBuildRead) {
    return socialAppBuild;
  }
  socialAppBuildRead = true;
  try {
    const version: unknown = getVersion();
    const formatted =
      typeof version === 'string' && version.length > 0
        ? formatAnalyticsAppVersion(
            version,
            process.env.METAMASK_ENVIRONMENT,
            process.env.METAMASK_BUILD_ATTRIBUTION,
          )
        : '';
    socialAppBuild = formatted || undefined;
  } catch {
    socialAppBuild = undefined;
  }
  return socialAppBuild;
};
export const withSocialAppBuild = <T extends object>(properties: T): T => {
  const app_build = readSocialAppBuild();
  return app_build ? { ...properties, app_build } : properties;
};
