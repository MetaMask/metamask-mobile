import {
  isVaultRelatedError,
  trackVaultCorruption,
  VaultCorruptionTrackingProperties,
} from './vaultCorruptionTracking';
import {
  AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
  VAULT_CREATION_ERROR,
  NO_VAULT_IN_BACKUP_ERROR,
} from '../../constants/error';
import { VAULT_ERROR } from '../../components/Views/Login/constants';
import { MetaMetricsEvents } from '../../core/Analytics/MetaMetrics.events';
import { analytics } from './analytics';
import { AnalyticsEventBuilder } from './AnalyticsEventBuilder';
import Logger from '../Logger';

// Mock dependencies
jest.mock('./analytics');
jest.mock('./AnalyticsEventBuilder');
jest.mock('../Logger');

const mockedAnalytics = analytics as jest.Mocked<typeof analytics>;
const mockedAnalyticsEventBuilder = AnalyticsEventBuilder as jest.Mocked<
  typeof AnalyticsEventBuilder
>;
const mockedLogger = Logger as jest.Mocked<typeof Logger>;

describe('vaultCorruptionTracking', () => {
  const mockEventBuilder = {
    addProperties: jest.fn(),
    build: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockedAnalytics.trackEvent.mockImplementation(() => undefined);

    mockedAnalyticsEventBuilder.createEventBuilder.mockReturnValue(
      mockEventBuilder as unknown as ReturnType<
        typeof AnalyticsEventBuilder.createEventBuilder
      >,
    );
    mockEventBuilder.addProperties.mockReturnValue(
      mockEventBuilder as unknown as ReturnType<
        typeof AnalyticsEventBuilder.createEventBuilder
      >,
    );
    mockEventBuilder.build.mockReturnValue({ event: 'test' });
  });

  describe('isVaultRelatedError', () => {
    it('detects migration vault errors', () => {
      const migrationVaultErrors = [
        'Invalid vault in KeyringController',
        'Migration 35: Invalid vault in KeyringController',
        'Existing user missing vault in KeyringController',
        'Migration 93: Existing user missing vault in KeyringController',
      ];

      migrationVaultErrors.forEach((errorMessage) => {
        expect(isVaultRelatedError(errorMessage)).toBe(true);
      });
    });

    it('detects vault creation and backup errors', () => {
      const vaultSystemErrors = [
        VAULT_CREATION_ERROR,
        `Failed: ${VAULT_CREATION_ERROR}`,
        NO_VAULT_IN_BACKUP_ERROR,
        `Error: ${NO_VAULT_IN_BACKUP_ERROR}`,
      ];

      vaultSystemErrors.forEach((errorMessage) => {
        expect(isVaultRelatedError(errorMessage)).toBe(true);
      });
    });

    it('detects vault unlock errors', () => {
      const vaultUnlockErrors = [
        VAULT_ERROR,
        `Error: ${VAULT_ERROR}`,
        `Failed with: ${VAULT_ERROR}`,
      ];

      vaultUnlockErrors.forEach((errorMessage) => {
        expect(isVaultRelatedError(errorMessage)).toBe(true);
      });
    });

    it('detects system authentication failures', () => {
      const systemAuthErrors = [
        AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
        `Error: ${AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS}`,
        `Failed with: ${AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS}`,
      ];

      systemAuthErrors.forEach((errorMessage) => {
        expect(isVaultRelatedError(errorMessage)).toBe(true);
      });
    });

    it('is case insensitive for all patterns', () => {
      // Given: error messages with different cases
      // When: checking if they are vault-related
      // Then: should return true (function converts to lowercase)
      expect(isVaultRelatedError('INVALID VAULT IN KEYRINGCONTROLLER')).toBe(
        true,
      );
      expect(isVaultRelatedError('Invalid Vault In KeyringController')).toBe(
        true,
      );
      expect(isVaultRelatedError(VAULT_ERROR.toUpperCase())).toBe(true);
      expect(isVaultRelatedError(VAULT_CREATION_ERROR.toUpperCase())).toBe(
        true,
      );
      expect(isVaultRelatedError(NO_VAULT_IN_BACKUP_ERROR.toUpperCase())).toBe(
        true,
      );
    });

    it('detects patterns within longer error messages', () => {
      const longErrorMessages = [
        `Migration failed: ${VAULT_ERROR} - please restore wallet`,
        `Backup restoration error: ${NO_VAULT_IN_BACKUP_ERROR}`,
        `System failure: ${AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS} detected`,
        `Vault initialization failed: ${VAULT_CREATION_ERROR}`,
        'Migration 75: Invalid vault in KeyringController - corrupted data detected',
      ];

      longErrorMessages.forEach((errorMessage) => {
        expect(isVaultRelatedError(errorMessage)).toBe(true);
      });
    });

    it('does not detect network errors', () => {
      const networkErrors = [
        'Network request failed',
        'Connection timeout',
        'DNS resolution failed',
        'HTTP 500 error',
        'API endpoint not found',
      ];

      networkErrors.forEach((errorMessage) => {
        expect(isVaultRelatedError(errorMessage)).toBe(false);
      });
    });

    it('does not detect UI/component errors', () => {
      const uiErrors = [
        'Component rendering failed',
        'Navigation error',
        'State update failed',
        'Props validation error',
        'Hook dependency error',
      ];

      uiErrors.forEach((errorMessage) => {
        expect(isVaultRelatedError(errorMessage)).toBe(false);
      });
    });

    it('does not detect validation errors', () => {
      const validationErrors = [
        'Invalid email format',
        'Password too short',
        'Required field missing',
        'Invalid phone number',
        'Form validation failed',
      ];

      validationErrors.forEach((errorMessage) => {
        expect(isVaultRelatedError(errorMessage)).toBe(false);
      });
    });

    it('does not detect generic errors', () => {
      const genericErrors = [
        'Something went wrong',
        'Unexpected error occurred',
        'Operation failed',
        'Unknown error',
        'Internal server error',
      ];

      genericErrors.forEach((errorMessage) => {
        expect(isVaultRelatedError(errorMessage)).toBe(false);
      });
    });

    it('returns false for empty or whitespace strings', () => {
      const emptyStrings = ['', ' ', '   ', '\t', '\n', '\r\n'];

      emptyStrings.forEach((errorMessage) => {
        expect(isVaultRelatedError(errorMessage)).toBe(false);
      });
    });

    it('does not match similar but different error patterns', () => {
      const nonVaultErrors = [
        'Invalid state in KeyringController', // missing 'vault'
        'User missing wallet in KeyringController', // not 'vault'
        'Error creating the wallet', // not 'vault'
        'No wallet in backup', // not 'vault'
        'Cannot unlock with previous wallet', // not 'vault'
        'AUTHENTICATION_APP_TRIGGERED', // missing suffix
        'General migration error',
        'Migration failed for unknown reason',
      ];

      nonVaultErrors.forEach((errorMessage) => {
        expect(isVaultRelatedError(errorMessage)).toBe(false);
      });
    });

    it('detects all imported error constants', () => {
      // Given: actual error constants from the codebase
      // When: checking if they are vault-related
      // Then: should return true
      expect(isVaultRelatedError(VAULT_ERROR)).toBe(true);
      expect(isVaultRelatedError(VAULT_CREATION_ERROR)).toBe(true);
      expect(isVaultRelatedError(NO_VAULT_IN_BACKUP_ERROR)).toBe(true);
      expect(
        isVaultRelatedError(AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS),
      ).toBe(true);
    });

    it('handles special characters and formatting', () => {
      const specialCharErrors = [
        `Error: ${VAULT_ERROR}`,
        `[${VAULT_CREATION_ERROR}]`,
        `Failed - ${NO_VAULT_IN_BACKUP_ERROR}`,
        `System error: ${AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS}`,
        'Migration 35: Invalid vault in KeyringController (corrupted)',
      ];

      specialCharErrors.forEach((errorMessage) => {
        expect(isVaultRelatedError(errorMessage)).toBe(true);
      });
    });

    it('handles unicode characters', () => {
      const unicodeErrors = [
        `${VAULT_ERROR} 🔒`,
        `${VAULT_CREATION_ERROR} ⚠️`,
        `${NO_VAULT_IN_BACKUP_ERROR} 🚫`,
        `${AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS} ❌`,
      ];

      unicodeErrors.forEach((errorMessage) => {
        expect(isVaultRelatedError(errorMessage)).toBe(true);
      });
    });

    it('handles very long error messages', () => {
      const longError = 'A'.repeat(1000) + VAULT_ERROR + 'B'.repeat(1000);
      expect(isVaultRelatedError(longError)).toBe(true);

      const longNonVaultError = 'A'.repeat(2000);
      expect(isVaultRelatedError(longNonVaultError)).toBe(false);
    });

    it('handles multiple pattern matches', () => {
      const multipleMatches = [
        `${VAULT_ERROR} and ${VAULT_CREATION_ERROR}`,
        `Migration error: ${NO_VAULT_IN_BACKUP_ERROR} with ${AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS}`,
        'Invalid vault in KeyringController with existing user missing vault in KeyringController',
      ];

      multipleMatches.forEach((errorMessage) => {
        expect(isVaultRelatedError(errorMessage)).toBe(true);
      });
    });
  });

  describe('trackVaultCorruption', () => {
    const mockProperties: VaultCorruptionTrackingProperties = {
      error_type: 'vault_corruption',
      context: 'test_context',
    };

    it('tracks vault-related errors', () => {
      const errorMessage = VAULT_ERROR;

      trackVaultCorruption(errorMessage, mockProperties);

      expect(
        mockedAnalyticsEventBuilder.createEventBuilder,
      ).toHaveBeenCalledWith(MetaMetricsEvents.VAULT_CORRUPTION_DETECTED);
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        error_message: errorMessage,
        ...mockProperties,
      });
      expect(mockedAnalytics.trackEvent).toHaveBeenCalledWith({
        event: 'test',
      });
    });

    it('does not track non-vault-related errors', () => {
      const errorMessage = 'Network request failed';

      trackVaultCorruption(errorMessage, mockProperties);

      expect(mockedAnalytics.trackEvent).not.toHaveBeenCalled();
      expect(
        mockedAnalyticsEventBuilder.createEventBuilder,
      ).not.toHaveBeenCalled();
    });

    it('logs error and does not throw when trackEvent fails', () => {
      mockedAnalytics.trackEvent.mockImplementation(() => {
        throw new Error('Tracking failed');
      });
      const errorMessage = VAULT_ERROR;

      expect(() => {
        trackVaultCorruption(errorMessage, mockProperties);
      }).not.toThrow();

      expect(mockedLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Error tracking vault corruption event - analytics tracking failed',
      );
    });

    it('passes additional properties', () => {
      const errorMessage = VAULT_ERROR;
      const additionalProps = {
        ...mockProperties,
        migration_version: '35',
        user_id: 'test-user',
      };

      trackVaultCorruption(errorMessage, additionalProps);

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        error_message: errorMessage,
        ...additionalProps,
      });
    });

    it.each([
      VAULT_ERROR,
      VAULT_CREATION_ERROR,
      NO_VAULT_IN_BACKUP_ERROR,
      AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
    ] as const)('tracks all vault error types: %s', (errorConstant) => {
      trackVaultCorruption(errorConstant, mockProperties);

      expect(mockedAnalytics.trackEvent).toHaveBeenCalledWith({
        event: 'test',
      });
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        error_message: errorConstant,
        ...mockProperties,
      });
    });
  });
});
