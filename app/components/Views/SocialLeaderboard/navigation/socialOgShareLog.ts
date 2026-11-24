import Logger from '../../../../util/Logger';

/** Search for this prefix to follow one share through the whole og flow. */
export const SOCIAL_OG_SHARE_LOG_PREFIX = '[SocialOgShare]';

const stringify = (data: unknown): string => {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

/**
 * Logs one step of the share preview flow. Objects are pretty-printed so
 * nested Branch and card payloads stay readable in Metro and device logs.
 * Never pass auth tokens. Logging failures are swallowed so they can never
 * stop a share.
 */
export const logSocialOgShare = (message: string, data?: unknown): void => {
  if (!__DEV__) {
    return;
  }

  try {
    if (data === undefined) {
      Logger.log(SOCIAL_OG_SHARE_LOG_PREFIX, message);
      return;
    }
    Logger.log(SOCIAL_OG_SHARE_LOG_PREFIX, message, stringify(data));
  } catch {
    // Diagnostics only.
  }
};
