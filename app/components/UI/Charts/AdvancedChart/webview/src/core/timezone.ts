// User-timezone resolution for TradingView's `timezone` widget option.
//
// Ported from chartLogic.js (~line 5299-5417). TradingView only accepts a
// fixed set of IANA timezone IDs. `Intl.DateTimeFormat().resolvedOptions()`
// on device returns the canonical zone; we map a small set of legacy
// aliases and fall back to Etc/UTC when the zone isn't in TV's list.

/** IANA identifiers TradingView's Advanced Charts library accepts. */
export const TV_SUPPORTED_TIMEZONES: readonly string[] = [
  'Etc/UTC',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Tunis',
  'America/Anchorage',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Caracas',
  'America/Chicago',
  'America/El_Salvador',
  'America/Halifax',
  'America/Juneau',
  'America/Lima',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Phoenix',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Toronto',
  'America/Vancouver',
  'Asia/Astana',
  'Asia/Ashkhabad',
  'Asia/Bahrain',
  'Asia/Bangkok',
  'Asia/Chongqing',
  'Asia/Colombo',
  'Asia/Dhaka',
  'Asia/Dubai',
  'Asia/Ho_Chi_Minh',
  'Asia/Hong_Kong',
  'Asia/Jakarta',
  'Asia/Jerusalem',
  'Asia/Karachi',
  'Asia/Kabul',
  'Asia/Kathmandu',
  'Asia/Kolkata',
  'Asia/Kuala_Lumpur',
  'Asia/Kuwait',
  'Asia/Manila',
  'Asia/Muscat',
  'Asia/Nicosia',
  'Asia/Qatar',
  'Asia/Riyadh',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Taipei',
  'Asia/Tehran',
  'Asia/Tel_Aviv',
  'Asia/Tokyo',
  'Asia/Yangon',
  'Atlantic/Azores',
  'Atlantic/Reykjavik',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Sydney',
  'Europe/Amsterdam',
  'Europe/Athens',
  'Europe/Belgrade',
  'Europe/Berlin',
  'Europe/Bratislava',
  'Europe/Brussels',
  'Europe/Bucharest',
  'Europe/Budapest',
  'Europe/Copenhagen',
  'Europe/Dublin',
  'Europe/Helsinki',
  'Europe/Istanbul',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Luxembourg',
  'Europe/Madrid',
  'Europe/Malta',
  'Europe/Moscow',
  'Europe/Oslo',
  'Europe/Paris',
  'Europe/Riga',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Tallinn',
  'Europe/Vienna',
  'Europe/Vilnius',
  'Europe/Warsaw',
  'Europe/Zurich',
  'Pacific/Auckland',
  'Pacific/Chatham',
  'Pacific/Fakaofo',
  'Pacific/Honolulu',
  'Pacific/Norfolk',
  'US/Mountain',
];

/**
 * Intl canonical names → TradingView legacy aliases. Intl returns
 * `America/Denver` but TradingView expects `US/Mountain`. Add here as
 * new devices report unmapped canonicals.
 */
export const CANONICAL_TO_TV: Readonly<Record<string, string>> = {
  'America/Denver': 'US/Mountain',
  'Asia/Ashgabat': 'Asia/Ashkhabad',
  'Asia/Almaty': 'Asia/Astana',
};

/**
 * Resolves the device timezone to a TV-supported IANA identifier. Falls back
 * to `Etc/UTC` when Intl fails or the resolved zone isn't in TV's list.
 */
export function resolveUserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
    const mapped = CANONICAL_TO_TV[tz] ?? tz;
    return TV_SUPPORTED_TIMEZONES.includes(mapped) ? mapped : 'Etc/UTC';
  } catch {
    return 'Etc/UTC';
  }
}
