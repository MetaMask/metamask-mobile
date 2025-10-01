/**
 * Asset Background Configuration
 *
 * Some token logos have poor visibility in certain themes due to their design:
 * - Dark logos on transparent backgrounds become invisible in dark mode
 * - Light logos on transparent backgrounds become invisible in light mode
 *
 * This configuration ensures optimal visibility by applying contrasting backgrounds
 * when needed, while maintaining performance with O(1) Set lookups.
 */

// Assets with dark logos that need white backgrounds in dark mode for visibility
export const ASSETS_REQUIRING_LIGHT_BG = new Set([
  'ETH',
  'XRP',
  'FARTCOIN',
  'ADA',
  'WLD',
  'NEAR',
  'ONDO',
  'XLM',
  'RESOLV',
  'CFX',
  'DYM',
  'USUAL',
  'BIGTIME',
  'GALA',
  'AR',
  'UNI',
  'ETHFI',
  // ... more assets
]);

// Assets with light logos that need dark backgrounds in light mode for visibility
export const ASSETS_REQUIRING_DARK_BG = new Set([
  'S',
  'RESOLV',
  'IO',
  'USUAL',
  'SOPH',
  'SAGA',
  'XPL',
  // Add more assets that need dark backgrounds in light mode
]);

// Assets with 'k' prefix that share logos with their base tokens
export const K_PREFIX_ASSETS = new Set([
  'KBONK',
  'KPEPE',
  'KSHIB',
  'KFLOKI',
  'KNEIRO',
  'KLUNC',
]);
