/**
 * Countries where Ondo Finance products are restricted due to regulatory requirements.
 * This list is used across features that surface Ondo assets (RWA tokens, campaigns, etc.)
 * to gate access consistently.
 */
// prettier-ignore
export const ONDO_RESTRICTED_COUNTRIES = new Set([
  'AF', 'DZ', 'BY', 'CA', 'CN', 'CU', 'KP',
  'ER', 'IR', 'LY', 'MM', 'MA', 'NP', 'RU',
  'SO', 'SS', 'SD', 'SY', 'US', 'VE',
  'BR', 'HK', 'MY', 'SG', 'CH', 'GB',
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK',
  'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL',
  'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS',
  'LI', 'NO', 'UA',
]);
