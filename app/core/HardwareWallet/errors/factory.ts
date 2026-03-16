import {
  LEDGER_ERROR_MAPPINGS,
  BLE_ERROR_MAPPINGS,
  MOBILE_ERROR_MAPPINGS,
  Severity,
  Category,
  ErrorCode,
  HardwareWalletError,
  HardwareWalletErrorOptions,
  HardwareWalletType,
} from '@metamask/hw-wallet-sdk';
import { MOBILE_ERROR_EXTENSIONS } from './mappings';

const COMBINED_ERROR_MAPPINGS = [
  ...Object.values(LEDGER_ERROR_MAPPINGS),
  ...Object.values(BLE_ERROR_MAPPINGS),
  ...Object.values(MOBILE_ERROR_MAPPINGS),
];

/**
 * Get error info from SDK mappings.
 */
function getSDKErrorInfo(
  code: ErrorCode,
): { severity: Severity; category: Category; message: string } | null {
  const sdkMapping = COMBINED_ERROR_MAPPINGS.find((m) => m.code === code);
  if (sdkMapping) {
    return {
      severity: sdkMapping.severity,
      category: sdkMapping.category,
      message: sdkMapping.message,
    };
  }
  return null;
}

/**
 * Create a HardwareWalletError from an error code
 *
 * Combines SDK mappings with Mobile specific extensions for:
 * - severity/category from SDK (with fallback to Unknown)
 * - Localized messages from Mobile extensions
 * - recoveryAction from Mobile extensions
 *
 * @param code - The error code from hw-wallet-sdk ErrorCode
 * @param walletType - Optional wallet type for context
 * @param technicalMessage - Optional override for technical message
 * @param options - Additional options
 * @returns A new HardwareWalletError instance
 */
export function createHardwareWalletError(
  code: ErrorCode,
  walletType?: HardwareWalletType,
  technicalMessage?: string,
  options?: { cause?: Error; metadata?: Record<string, unknown> },
): HardwareWalletError {
  // Get base info from SDK (fallback to Warning/Unknown if not found)
  const sdkInfo = getSDKErrorInfo(code);
  const severity = sdkInfo?.severity ?? Severity.Warning;
  const category = sdkInfo?.category ?? Category.Unknown;

  // Get Mobile extension for localized message and recovery action
  const codeExtension = MOBILE_ERROR_EXTENSIONS[code];
  const extension = codeExtension ?? MOBILE_ERROR_EXTENSIONS[ErrorCode.Unknown];

  const userMessage =
    codeExtension?.getLocalizedMessage(walletType) ??
    sdkInfo?.message ??
    extension.getLocalizedMessage(walletType);
  const recoveryAction = extension.recoveryAction;

  const errorOptions: HardwareWalletErrorOptions = {
    code,
    severity,
    category,
    userMessage,
    metadata: {
      ...options?.metadata,
      walletType,
      recoveryAction,
    },
    cause: options?.cause,
  };

  return new HardwareWalletError(
    technicalMessage || sdkInfo?.message || 'Unknown error',
    errorOptions,
  );
}
