export enum LedgerCommunicationErrors {
  LedgerDisconnected = 'LedgerDisconnected',
  LedgerHasPendingConfirmation = 'LedgerHasPendingConfirmation',
  FailedToOpenApp = 'FailedToOpenApp',
  FailedToCloseApp = 'FailedToCloseApp',
  UserRefusedConfirmation = 'UserRefusedConfirmation',
  AppIsNotInstalled = 'AppIsNotInstalled',
  EthAppNotOpen = 'EthAppNotOpen',
  LedgerIsLocked = 'LedgerIsLocked',
  NotSupported = 'NotSupported',
  UnknownError = 'UnknownError',
  NonceTooLow = 'NonceTooLow',
  BlindSignError = 'BlindSignError',
}

/**
 * Status codes that indicate the Ethereum app is not running on the Ledger device.
 * - 0x6d00: CLA_NOT_SUPPORTED - wrong app class
 * - 0x6e00: INS_NOT_SUPPORTED - instruction not supported by current app
 * - 0x6e01: INS_NOT_SUPPORTED variant
 * - 0x6511: APP_NOT_OPEN - app is not open
 * - 0x6700: INCORRECT_LENGTH - can occur when wrong app is open
 * - 0x650f: UNKNOWN_ERROR - often indicates app not ready/open
 */
export const ETH_APP_NOT_OPEN_STATUS_CODES = [
  0x6d00, 0x6e00, 0x6e01, 0x6511, 0x6700, 0x650f,
] as const;

/**
 * Check if a status code indicates the Ethereum app is not open.
 *
 * @param statusCode - The status code to check
 * @returns True if the status code indicates ETH app is not open
 */
export const isEthAppNotOpenStatusCode = (statusCode: number): boolean =>
  (ETH_APP_NOT_OPEN_STATUS_CODES as readonly number[]).includes(statusCode);

/**
 * Check if an error message contains any of the ETH app not open status codes.
 *
 * @param message - The error message to check
 * @returns True if the message contains an ETH app not open status code
 */
export const isEthAppNotOpenErrorMessage = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  for (const code of ETH_APP_NOT_OPEN_STATUS_CODES) {
    const hexCode = `0x${code.toString(16)}`;
    if (lowerMessage.includes(hexCode)) {
      return true;
    }
  }
  return false;
};

/**
 * Check if error is due to Ethereum app not being open on Ledger device.
 *
 * @param error - The error to check
 * @returns True if error indicates ETH app is not open
 */
export const isEthAppNotOpenError = (error: unknown): boolean => {
  // Check for TransportStatusError with specific status codes
  if (
    error &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'TransportStatusError' &&
    'statusCode' in error
  ) {
    const statusCode = (error as { statusCode: number }).statusCode;
    return isEthAppNotOpenStatusCode(statusCode);
  }

  // Check for error messages that indicate ETH app is not open
  if (error instanceof Error) {
    return isEthAppNotOpenErrorMessage(error.message);
  }

  return false;
};

export enum BluetoothPermissionErrors {
  BluetoothAccessBlocked = 'BluetoothAccessBlocked',
  LocationAccessBlocked = 'LocationAccessBlocked',
  NearbyDevicesAccessBlocked = 'NearbyDevicesAccessBlocked',
}
