/**
 * Constants for Network Selector sources
 * These values are used to identify the source/context where the network selector was opened from
 */
export const NETWORK_SELECTOR_SOURCES = {
  SEND_FLOW: 'SendFlow',
} as const;

/**
 * Type for network selector source values
 */
export type NetworkSelectorSource =
  (typeof NETWORK_SELECTOR_SOURCES)[keyof typeof NETWORK_SELECTOR_SOURCES];

/**
 * Array of all valid network selector sources for PropTypes validation
 */
export const NETWORK_SELECTOR_SOURCE_VALUES = Object.values(
  NETWORK_SELECTOR_SOURCES,
);

/**
 * Constants for Network Selector test IDs
 */
export const NETWORK_SELECTOR_TEST_IDS = {
  CONTEXTUAL_NETWORK_PICKER: 'contextual-network-picker',
} as const;
