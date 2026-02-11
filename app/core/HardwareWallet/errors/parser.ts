import {
  ErrorCode,
  HardwareWalletError,
  LEDGER_ERROR_MAPPINGS,
  HardwareWalletType,
} from '@metamask/hw-wallet-sdk';
import { LedgerCommunicationErrors } from '../../Ledger/ledgerErrors';
import { createHardwareWalletError } from './factory';
import { ERROR_NAME_MAPPINGS } from './mappings';

/**
 * Convert a numeric status code to hex string format used by SDK mappings
 */
function toHexStatusCode(statusCode: number): string {
  return `0x${statusCode.toString(16).padStart(4, '0')}`;
}

/**
 * Extract status code from an error
 */
function extractStatusCode(error: unknown): number | null {
  if (!error) return null;

  // Check for statusCode property (TransportStatusError)
  // Use try/catch and direct property access for cross-realm errors
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    if (typeof errorObj.statusCode === 'number') {
      return errorObj.statusCode;
    }
  }

  // Check in error message for hex status code
  let message: string;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    message = String((error as Error).message);
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }

  // Match exactly 4 hex digits, not followed by more hex digits
  // (prevents matching beginning of Ethereum addresses like 0x6985abc...)
  const hexMatch = message.match(/0x[0-9a-fA-F]{4}(?![0-9a-fA-F])/);
  if (hexMatch) {
    return parseInt(hexMatch[0], 16);
  }

  return null;
}

/**
 * Parse a LedgerCommunicationErrors enum value to HardwareWalletError.
 */
function parseLedgerCommunicationError(
  error: LedgerCommunicationErrors,
  walletType: HardwareWalletType,
): HardwareWalletError {
  switch (error) {
    case LedgerCommunicationErrors.LedgerDisconnected:
      return createHardwareWalletError(
        ErrorCode.DeviceDisconnected,
        walletType,
      );

    case LedgerCommunicationErrors.LedgerHasPendingConfirmation:
      return createHardwareWalletError(
        ErrorCode.UserConfirmationRequired,
        walletType,
      );

    case LedgerCommunicationErrors.FailedToOpenApp:
    case LedgerCommunicationErrors.FailedToCloseApp:
      return createHardwareWalletError(
        ErrorCode.DeviceStateEthAppClosed,
        walletType,
      );

    case LedgerCommunicationErrors.UserRefusedConfirmation:
      return createHardwareWalletError(ErrorCode.UserRejected, walletType);

    case LedgerCommunicationErrors.AppIsNotInstalled:
      return createHardwareWalletError(
        ErrorCode.DeviceMissingCapability,
        walletType,
      );

    case LedgerCommunicationErrors.LedgerIsLocked:
      return createHardwareWalletError(
        ErrorCode.AuthenticationDeviceLocked,
        walletType,
      );

    case LedgerCommunicationErrors.NotSupported:
      return createHardwareWalletError(
        ErrorCode.MobileNotSupported,
        walletType,
      );

    case LedgerCommunicationErrors.BlindSignError:
      return createHardwareWalletError(
        ErrorCode.DeviceStateBlindSignNotSupported,
        walletType,
      );

    case LedgerCommunicationErrors.DeviceUnresponsive:
      return createHardwareWalletError(
        ErrorCode.DeviceUnresponsive,
        walletType,
      );

    case LedgerCommunicationErrors.UnknownError:
    default:
      return createHardwareWalletError(ErrorCode.Unknown, walletType);
  }
}

/**
 * Parse a Ledger status code to HardwareWalletError.
 */
function parseLedgerStatusCode(
  statusCode: number,
  walletType: HardwareWalletType,
  originalError?: Error,
): HardwareWalletError {
  const hexCode = toHexStatusCode(statusCode);
  const mapping = LEDGER_ERROR_MAPPINGS[hexCode];

  if (mapping) {
    // Special handling for 0x6985 which can mean user rejected OR blind signing
    if (hexCode === '0x6985' && originalError) {
      const message = originalError.message?.toLowerCase() || '';
      if (message.includes('blind sign') || message.includes('blind signing')) {
        return createHardwareWalletError(
          ErrorCode.DeviceStateBlindSignNotSupported,
          walletType,
          undefined,
          { cause: originalError, metadata: { statusCode, hexCode } },
        );
      }
    }

    return createHardwareWalletError(mapping.code, walletType, undefined, {
      cause: originalError,
      metadata: { statusCode, hexCode },
    });
  }

  // Unknown status code
  return createHardwareWalletError(
    ErrorCode.Unknown,
    walletType,
    `Unknown Ledger error (status: ${hexCode})`,
    { cause: originalError, metadata: { statusCode, hexCode } },
  );
}

/**
 * Parse error by checking error name
 * Ledger packages throws errors with specific names like 'DisconnectedDevice'
 */
function parseErrorByName(
  error: Error,
  walletType: HardwareWalletType,
): HardwareWalletError | null {
  const name = error.name;

  // TransportStatusError requires special handling - extract and parse the status code
  // The error name alone doesn't tell us what went wrong; the statusCode does
  if (name === 'TransportStatusError') {
    const statusCode = extractStatusCode(error);
    if (statusCode) {
      return parseLedgerStatusCode(statusCode, walletType, error);
    }
    // If no status code found, fall through to unknown error
    return null;
  }

  // Check known Ledger error names
  if (ERROR_NAME_MAPPINGS[name]) {
    return createHardwareWalletError(
      ERROR_NAME_MAPPINGS[name],
      walletType,
      undefined,
      { cause: error, metadata: { errorName: name } },
    );
  }

  return null;
}

/**
 * Parse error by checking common patterns in error messages
 */
function parseErrorByMessage(
  error: Error,
  walletType: HardwareWalletType,
): HardwareWalletError | null {
  const message = error.message.toLowerCase();
  const name = error.name?.toLowerCase() ?? '';

  // Check for BLE errors first
  // BleError with "Operation was cancelled" is a Bluetooth connection issue
  if (name === 'bleerror' || message.includes('bleerror')) {
    return createHardwareWalletError(
      ErrorCode.BluetoothConnectionFailed,
      walletType,
      undefined,
      { cause: error },
    );
  }

  // Map message patterns to error codes
  const messagePatterns: {
    patterns: string[];
    code: ErrorCode;
    condition?: (msg: string) => boolean;
  }[] = [
    {
      patterns: ['disconnected', 'disconnect', 'connection lost'],
      code: ErrorCode.DeviceDisconnected,
    },
    {
      patterns: ['locked', 'unlock'],
      code: ErrorCode.AuthenticationDeviceLocked,
    },
    {
      patterns: ['blind signing', 'blind sign', 'contract data'],
      code: ErrorCode.DeviceStateBlindSignNotSupported,
    },
    {
      patterns: ['app'],
      code: ErrorCode.DeviceStateEthAppClosed,
      condition: (msg) =>
        msg.includes('open') || msg.includes('launch') || msg.includes('start'),
    },
    {
      patterns: ['rejected', 'cancelled', 'refused'],
      code: ErrorCode.UserRejected,
    },
    { patterns: ['timeout', 'timed out'], code: ErrorCode.ConnectionTimeout },
    {
      patterns: ['not authorized', 'unauthorized'],
      code: ErrorCode.PermissionNearbyDevicesDenied,
      condition: (msg) => msg.includes('bluetooth'),
    },
    {
      patterns: ['bluetooth'],
      code: ErrorCode.BluetoothDisabled,
      condition: (msg) => msg.includes('off') || msg.includes('disabled'),
    },
    {
      patterns: ['bluetooth'],
      code: ErrorCode.BluetoothScanFailed,
      condition: (msg) => msg.includes('scan'),
    },
    { patterns: ['bluetooth'], code: ErrorCode.BluetoothConnectionFailed },
  ];

  for (const { patterns, code, condition } of messagePatterns) {
    const matchesPattern = patterns.some((p) => message.includes(p));
    const meetsCondition = !condition || condition(message);

    if (matchesPattern && meetsCondition) {
      return createHardwareWalletError(code, walletType, undefined, {
        cause: error,
      });
    }
  }

  return null;
}

/**
 * Main error parser function
 *
 * Attempts to parse any error into a structured HardwareWalletError.
 * Uses SDK mappings where possible, with Mobile-specific fallbacks.
 *
 * @param error - The error to parse
 * @param walletType - The type of hardware wallet
 * @returns A structured HardwareWalletError
 */
export function parseErrorByType(
  error: unknown,
  walletType: HardwareWalletType,
): HardwareWalletError {
  if (error instanceof HardwareWalletError) {
    return error;
  }

  if (isErrorCodeObject(error)) {
    const message =
      typeof error.message === 'string' ? error.message : undefined;
    return createHardwareWalletError(error.code, walletType, message);
  }

  if (isLedgerCommunicationError(error)) {
    const code = typeof error === 'string' ? error : error.code;
    return parseLedgerCommunicationError(code, walletType);
  }

  if (isErrorLike(error)) {
    const parsedByName = parseErrorByName(error, walletType);
    if (parsedByName) {
      return parsedByName;
    }

    const statusCode = extractStatusCode(error);
    if (statusCode) {
      return parseLedgerStatusCode(statusCode, walletType, error);
    }

    const parsedByMessage = parseErrorByMessage(error, walletType);
    if (parsedByMessage) {
      return parsedByMessage;
    }

    return createHardwareWalletError(
      ErrorCode.Unknown,
      walletType,
      error.message,
      { cause: error },
    );
  }

  // Handle plain string errors
  if (typeof error === 'string') {
    return createHardwareWalletError(ErrorCode.Unknown, walletType, error);
  }

  // Ultimate fallback
  return createHardwareWalletError(
    ErrorCode.Unknown,
    walletType,
    'An unexpected error occurred',
  );
}

/**
 * Type guard: error is an object with an explicit ErrorCode (e.g. { code: ErrorCode.BluetoothDisabled, message?: string }).
 * Accepts both number and string so it works whether ErrorCode is a numeric or string enum.
 */
function isErrorCodeObject(
  error: unknown,
): error is { code: ErrorCode; message?: string } {
  if (error === null || typeof error !== 'object' || !('code' in error)) {
    return false;
  }
  const { code } = error;
  const validCodes = Object.values(ErrorCode);
  return (
    (typeof code === 'number' || typeof code === 'string') &&
    validCodes.includes(code as ErrorCode)
  );
}

/**
 * Type guard: error has Error-like shape (for cross-realm errors).
 */
function isErrorLike(error: unknown): error is Error {
  return (
    error instanceof Error ||
    (error !== null &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string')
  );
}

/**
 * Type guard: error is a LedgerCommunicationErrors value (string or object with .code).
 */
function isLedgerCommunicationError(
  error: unknown,
): error is LedgerCommunicationErrors | { code: LedgerCommunicationErrors } {
  if (
    typeof error === 'string' &&
    Object.values(LedgerCommunicationErrors).includes(
      error as LedgerCommunicationErrors,
    )
  ) {
    return true;
  }
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string' &&
    Object.values(LedgerCommunicationErrors).includes(
      (error as { code: LedgerCommunicationErrors }).code,
    )
  );
}
