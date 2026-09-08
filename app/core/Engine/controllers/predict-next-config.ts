import Logger from '../../../util/Logger';

/**
 * Validate the Predict API base URL configured for this build.
 *
 * The URL is absent from release builds until it ships via `builds.yml`, which
 * is expected rather than exceptional, so a missing value resolves to
 * `undefined` and only a malformed value is reported as an error.
 *
 * Takes the raw value as an argument because `process.env` reads are inlined at
 * build time and cannot be read through a shared helper.
 *
 * @param rawBaseUrl - The configured `MM_PREDICT_API_URL` value.
 * @returns The base URL, or `undefined` when unusable.
 */
export const resolvePredictApiBaseUrl = (
  rawBaseUrl: string | undefined,
): string | undefined => {
  if (!rawBaseUrl) {
    return undefined;
  }

  try {
    // eslint-disable-next-line no-new
    new URL(rawBaseUrl);
  } catch {
    Logger.error(new Error('Predict API URL is malformed.'));
    return undefined;
  }

  return rawBaseUrl;
};
