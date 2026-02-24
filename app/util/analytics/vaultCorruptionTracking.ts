import { MetaMetrics, MetaMetricsEvents } from '../../core/Analytics';
import { MetricsEventBuilder } from '../../core/Analytics/MetricsEventBuilder';
import Logger from '../Logger';
import {
  NO_VAULT_IN_BACKUP_ERROR,
  VAULT_CREATION_ERROR,
} from '../../constants/error';
import { VAULT_ERROR } from '../../components/Views/Login/constants';

/**
 * Properties for vault corruption tracking
 */
export interface VaultCorruptionTrackingProperties {
  error_type: string;
  context: string;
  [key: string]: unknown; // Allow additional context-specific properties
}

/**
 * Determines if an error message indicates actual vault corruption issues
 *
 * This function is more specific than the previous version to reduce false positives
 * from user authentication errors and focus on actual vault/keyring corruption.
 *
 * @param errorMessage - The error message to check
 * @returns true if the error appears to be actual vault corruption
 */
export const isVaultRelatedError = (errorMessage: string): boolean => {
  if (!errorMessage) return false;

  const lowerMessage = errorMessage.toLowerCase();

  // Only actual error messages found in MetaMask Mobile codebase
  const corruptionPatterns = [
    // Migration errors (found in migration files - vault-specific only)
    'invalid vault in keyringcontroller',
    'existing user missing vault in keyringcontroller',

    // Vault creation/parsing errors (from constants/error.ts)
    VAULT_CREATION_ERROR.toLowerCase(),
    NO_VAULT_IN_BACKUP_ERROR.toLowerCase(),

    // Actual vault error (from components/Views/Login/constants.ts)
    VAULT_ERROR.toLowerCase(),
  ];

  return corruptionPatterns.some((pattern) => lowerMessage.includes(pattern));
};

/**
 * Safely tracks vault corruption events with proper enabled state checking
 *
 * This utility function:
 * 1. Checks if the error is vault-related
 * 2. Checks if MetaMetrics is enabled before tracking
 * 3. Provides a consistent interface for vault corruption tracking
 * 4. Handles errors gracefully without throwing
 *
 * @param errorMessage - The error message from the caught exception
 * @param properties - Context-specific properties for the tracking event
 */
export const trackVaultCorruption = (
  errorMessage: string,
  properties: VaultCorruptionTrackingProperties,
): void => {
  try {
    // Only track if error appears to be vault-related
    if (!isVaultRelatedError(errorMessage)) {
      return;
    }

    const metaMetrics = MetaMetrics.getInstance();

    // Check if MetaMetrics is enabled before tracking
    if (!metaMetrics.isEnabled()) {
      // MetaMetrics is disabled, skip tracking silently
      return;
    }

    // Track the vault corruption event
    metaMetrics.trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.VAULT_CORRUPTION_DETECTED,
      )
        .addProperties({
          error_message: errorMessage,
          ...properties,
        })
        .build(),
    );
  } catch (error) {
    // Never throw from analytics tracking - log and continue
    Logger.error(
      error as Error,
      'Error tracking vault corruption event - analytics tracking failed',
    );
  }
};
