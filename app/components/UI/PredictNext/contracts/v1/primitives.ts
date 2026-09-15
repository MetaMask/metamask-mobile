import { refine, string } from '@metamask/superstruct';

/** Non-negative decimal string without leading zeros or exponent notation. */
export const amount = refine(string(), 'PredictAmount', (value) =>
  /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value),
);

/** Signed decimal string with an optional leading '-', without exponent notation. */
export const signedAmount = refine(string(), 'PredictSignedAmount', (value) =>
  /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value),
);

/** Decimal string in the inclusive range [0, 1]. */
export const decimal = refine(
  string(),
  'PredictDecimal',
  (value) => /^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(value) && Number(value) <= 1,
);

/** Absolute HTTPS URL string. */
export const httpsUrl = refine(string(), 'PredictHttpsUrl', (value) => {
  if (!/^https:\/\//i.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.length > 0;
  } catch {
    return false;
  }
});

/** ISO 8601 UTC timestamp string, for example '2026-03-01T12:00:00.000Z'. */
export const timestamp = refine(string(), 'PredictTimestamp', (value) => {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/.exec(
      value,
    );
  if (!match) {
    return false;
  }

  const [, year, month, day, hour, minute, second, fraction = ''] = match;
  const milliseconds = fraction.padEnd(3, '0').slice(0, 3);
  const parsed = Date.parse(value);
  return (
    !Number.isNaN(parsed) &&
    new Date(parsed).toISOString() ===
      `${year}-${month}-${day}T${hour}:${minute}:${second}.${milliseconds}Z`
  );
});
