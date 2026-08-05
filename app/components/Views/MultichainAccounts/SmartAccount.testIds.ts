export const SmartAccountIds = {
  SMART_ACCOUNT_CONTAINER: 'smart-account-container',
  /** Prefix for the network-row switch; prefer {@link getSmartAccountSwitchTestId}. */
  SMART_ACCOUNT_SWITCH: 'smart-account-switch',
};

/**
 * Unique smart-account switch testID for a given network display name.
 * Enables Appium to tap the correct row without XPath/Y-alignment heuristics.
 */
export const getSmartAccountSwitchTestId = (networkName: string): string =>
  `${SmartAccountIds.SMART_ACCOUNT_SWITCH}-${networkName}`;
