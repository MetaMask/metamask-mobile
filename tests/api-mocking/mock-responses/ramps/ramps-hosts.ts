/**
 * Test and e2e builds resolve ramps to production (`*.api`).
 * UAT (`*.uat-api`) stays matched so an override is still mocked.
 * These patterns never open a live connection.
 */
const RAMP_HOST = String.raw`(?:uat-)?api`;

export const rampUrl = (
  service: 'on-ramp' | 'on-ramp-cache' | 'on-ramp-content',
  pathPattern: string,
): RegExp =>
  new RegExp(
    `^https://${service}\\.${RAMP_HOST}\\.cx\\.metamask\\.io${pathPattern}`,
  );

export const isRampCacheHost = (hostname: string): boolean =>
  /^on-ramp-cache\.(?:uat-)?api\.cx\.metamask\.io$/.test(hostname);

export const isRampTranslateUrl = (url: string): boolean =>
  /on-ramp\.(?:uat-)?api\.cx\.metamask\.io\/providers\/transak-native-staging\/native\/translate/.test(
    url,
  );

/** UAT and production token-icon CDNs used by ramps fixture bodies. */
export const RAMP_TOKEN_ICON_URL =
  /^https:\/\/(?:uat-)?static\.cx\.metamask\.io\/api\/v[12]\/tokenIcons\/.*\.png$/;
