import { getVersion } from 'react-native-device-info';

const ENVIRONMENT_SUFFIXES: Record<string, string> = {
  rc: 'release-candidate',
  exp: 'experimental',
  dev: 'development',
};

/**
 * Formats the analytics App Version string from a native version and
 * METAMASK_ENVIRONMENT value.
 *
 * Production (or unset/empty) stays unsuffixed. Known non-prod envs use
 * friendly suffixes; any other non-prod env uses `-{environment}`.
 */
export const formatAnalyticsAppVersion = (
  baseVersion: string,
  environment: string | undefined,
): string => {
  const env = environment?.trim();

  if (!env || env === 'production') {
    return baseVersion;
  }

  const suffix = ENVIRONMENT_SUFFIXES[env] ?? env;
  return `${baseVersion}-${suffix}`;
};

/**
 * Analytics App Version for Segment/Mixpanel.
 *
 * Does not change native CFBundleShortVersionString / Android versionName.
 */
const getAnalyticsAppVersion = (): string =>
  formatAnalyticsAppVersion(getVersion(), process.env.METAMASK_ENVIRONMENT);

export default getAnalyticsAppVersion;
