import { getVersion } from 'react-native-device-info';

const ENVIRONMENT_SUFFIXES: Record<string, string> = {
  exp: 'experimental',
  dev: 'development',
};

const NIGHTLY_ATTRIBUTION = 'nightly';
const OFFICIAL_ATTRIBUTION = 'official';
const UNOFFICIAL_RC_SUFFIX = 'rc-unofficial';

/**
 * Formats the analytics App Version string from a native version, a
 * METAMASK_ENVIRONMENT value and a METAMASK_BUILD_ATTRIBUTION value.
 *
 * Production (or unset/empty) stays unsuffixed. Known non-prod envs use
 * friendly suffixes; any other non-prod env uses `-{environment}`.
 *
 * Nightly builds keep the raw environment code instead of the friendly suffix
 * (`-rc-nightly`, `-exp-nightly`) so they can be told apart from official
 * release candidates that share the same METAMASK_ENVIRONMENT.
 *
 * `rc` emits `-release-candidate` only when attribution is `official`. Any
 * other rc build (local, BrowserStack, ad-hoc CI) emits `-rc-unofficial`.
 */
export const formatAnalyticsAppVersion = (
  baseVersion: string,
  environment: string | undefined,
  buildAttribution?: string,
): string => {
  const env = environment?.trim();
  const attribution = buildAttribution?.trim();
  const isNightly = attribution === NIGHTLY_ATTRIBUTION;

  if (!env || env === 'production') {
    return isNightly ? `${baseVersion}-${NIGHTLY_ATTRIBUTION}` : baseVersion;
  }

  if (isNightly) {
    return `${baseVersion}-${env}-${NIGHTLY_ATTRIBUTION}`;
  }

  if (env === 'rc') {
    const suffix =
      attribution === OFFICIAL_ATTRIBUTION
        ? 'release-candidate'
        : UNOFFICIAL_RC_SUFFIX;
    return `${baseVersion}-${suffix}`;
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
  formatAnalyticsAppVersion(
    getVersion(),
    process.env.METAMASK_ENVIRONMENT,
    process.env.METAMASK_BUILD_ATTRIBUTION,
  );

export default getAnalyticsAppVersion;
