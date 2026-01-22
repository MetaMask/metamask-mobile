/**
 * Error Parser
 *
 * Parses raw errors from Ledger and other hardware wallets into
 * structured HardwareWalletError instances.
 *
 * Uses LEDGER_ERROR_MAPPINGS from @metamask/hw-wallet-sdk for status code
 * parsing, with Mobile-specific extensions for localization.
 */

import {
  ErrorCode,
  HardwareWalletError,
  LEDGER_ERROR_MAPPINGS,
} from '@metamask/hw-wallet-sdk';
import {
  LedgerCommunicationErrors,
  BluetoothPermissionErrors,
} from '../../Ledger/ledgerErrors';
import { HardwareWalletType } from '../helpers';
import { createHardwareWalletError } from './factory';
import {
  ERROR_NAME_MAPPINGS,
  ADDITIONAL_STATUS_CODE_MAPPINGS,
} from './mappings';

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

  const hexMatch = message.match(/0x[0-9a-fA-F]{4}/);
  if (hexMatch) {
    return parseInt(hexMatch[0], 16);
  }

  return null;
}

/**
 * Parse a LedgerCommunicationErrors enum value to ErrorCode
 * Maps Mobile's existing error enums to SDK error codes
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
 * Parse a BluetoothPermissionErrors enum value to HardwareWalletError
 * Maps directly to our ErrorCode since SDK doesn't have these mappings
 */
function parseBluetoothPermissionError(
  error: BluetoothPermissionErrors,
  walletType: HardwareWalletType,
): HardwareWalletError {
  // Map Mobile's BluetoothPermissionErrors directly to ErrorCode
  // Each has a specific recovery action defined in errorDefinitions.ts
  const errorCodeMapping: Record<BluetoothPermissionErrors, ErrorCode> = {
    [BluetoothPermissionErrors.BluetoothAccessBlocked]:
      ErrorCode.PermissionBluetoothDenied,
    [BluetoothPermissionErrors.LocationAccessBlocked]:
      ErrorCode.PermissionLocationDenied,
    [BluetoothPermissionErrors.NearbyDevicesAccessBlocked]:
      ErrorCode.PermissionNearbyDevicesDenied,
  };

  const code = errorCodeMapping[error] ?? ErrorCode.PermissionBluetoothDenied;
  return createHardwareWalletError(code, walletType);
}

/**
 * Parse a Ledger status code using SDK's LEDGER_ERROR_MAPPINGS
 * Falls back to message-based heuristics for ambiguous codes
 */
function parseLedgerStatusCode(
  statusCode: number,
  walletType: HardwareWalletType,
  originalError?: Error,
): HardwareWalletError {
  const hexCode = toHexStatusCode(statusCode);
  const mapping =
    LEDGER_ERROR_MAPPINGS[hexCode as keyof typeof LEDGER_ERROR_MAPPINGS];

  if (mapping) {
    // Special handling for 0x6985 which can mean user rejected OR blind signing
    if (hexCode === '0x6985' && originalError) {
      const message = originalError.message?.toLowerCase() || '';
      if (message.includes('blind') || message.includes('sign')) {
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

  // Check additional status codes not in SDK (Mobile-specific or legacy)
  if (ADDITIONAL_STATUS_CODE_MAPPINGS[statusCode]) {
    return createHardwareWalletError(
      ADDITIONAL_STATUS_CODE_MAPPINGS[statusCode],
      walletType,
      undefined,
      { cause: originalError, metadata: { statusCode, hexCode } },
    );
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
 * Ledger library throws errors with specific names like 'DisconnectedDevice'
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
      patterns: ['rejected', 'cancelled', 'denied', 'refused'],
      code: ErrorCode.UserRejected,
    },
    { patterns: ['timeout', 'timed out'], code: ErrorCode.ConnectionTimeout },
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
  // Already a HardwareWalletError
  if (error instanceof HardwareWalletError) {
    return error;
  }

  // Handle objects with explicit ErrorCode (e.g., { code: ErrorCode.BluetoothDisabled, message: '...' })
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'number' &&
    Object.values(ErrorCode).includes(error.code as ErrorCode)
  ) {
    const message =
      'message' in error && typeof error.message === 'string'
        ? error.message
        : undefined;
    return createHardwareWalletError(
      error.code as ErrorCode,
      walletType,
      message,
    );
  }

  // Handle LedgerCommunicationErrors enum
  if (
    typeof error === 'string' &&
    Object.values(LedgerCommunicationErrors).includes(
      error as LedgerCommunicationErrors,
    )
  ) {
    return parseLedgerCommunicationError(
      error as LedgerCommunicationErrors,
      walletType,
    );
  }

  // Handle BluetoothPermissionErrors enum
  if (
    typeof error === 'string' &&
    Object.values(BluetoothPermissionErrors).includes(
      error as BluetoothPermissionErrors,
    )
  ) {
    return parseBluetoothPermissionError(
      error as BluetoothPermissionErrors,
      walletType,
    );
  }

  // Handle error objects with a code property (LedgerCommunicationErrors from hook)
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string' &&
    Object.values(LedgerCommunicationErrors).includes(
      error.code as LedgerCommunicationErrors,
    )
  ) {
    return parseLedgerCommunicationError(
      error.code as LedgerCommunicationErrors,
      walletType,
    );
  }

  // Handle Error objects (use duck typing for cross-realm errors)
  const isErrorLike =
    error instanceof Error ||
    (error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as Error).message === 'string');

  if (isErrorLike) {
    const errorObj = error as Error;

    // First, try to parse by error name (e.g., DisconnectedDevice)
    const parsedByName = parseErrorByName(errorObj, walletType);
    if (parsedByName) {
      return parsedByName;
    }

    // Try to extract and parse status code using SDK mappings
    const statusCode = extractStatusCode(errorObj);
    if (statusCode) {
      return parseLedgerStatusCode(statusCode, walletType, errorObj);
    }

    // Try to parse by message patterns
    const parsedByMessage = parseErrorByMessage(errorObj, walletType);
    if (parsedByMessage) {
      return parsedByMessage;
    }

    // Fallback to unknown error
    return createHardwareWalletError(
      ErrorCode.Unknown,
      walletType,
      errorObj.message,
      { cause: errorObj },
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
