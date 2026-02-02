import {
  isVaultRelatedError,
  trackVaultCorruption,
  VaultCorruptionTrackingProperties,
} from './vaultCorruptionTracking';
import {
  VAULT_CREATION_ERROR,
  NO_VAULT_IN_BACKUP_ERROR,
} from '../../constants/error';
import { VAULT_ERROR } from '../../components/Views/Login/constants';
import { MetaMetrics, MetaMetricsEvents } from '../../core/Analytics';
import { MetricsEventBuilder } from '../../core/Analytics/MetricsEventBuilder';
import Logger from '../Logger';

// Mock dependencies
jest.mock('../../core/Analytics');
jest.mock('../../core/Analytics/MetricsEventBuilder');
jest.mock('../Logger');

const mockedMetaMetrics = MetaMetrics as jest.Mocked<typeof MetaMetrics>;
const mockedMetricsEventBuilder = MetricsEventBuilder as jest.Mocked<
  typeof MetricsEventBuilder
>;
const mockedLogger = Logger as jest.Mocked<typeof Logger>;

describe('vaultCorruptionTracking', () => {
  // Mock instance objects
  const mockMetaMetricsInstance = {
    isEnabled: jest.fn(),
    trackEvent: jest.fn(),
  };

  const mockEventBuilder = {
    addProperties: jest.fn(),
    build: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup MetaMetrics mock
    mockedMetaMetrics.getInstance.mockReturnValue(
      mockMetaMetricsInstance as never,
    );
    mockMetaMetricsInstance.isEnabled.mockReturnValue(true);
    mockMetaMetricsInstance.trackEvent.mockImplementation(() => undefined);

    // Setup MetricsEventBuilder mock
    mockedMetricsEventBuilder.createEventBuilder.mockReturnValue(
      mockEventBuilder as unknown as ReturnType<
        typeof MetricsEventBuilder.createEventBuilder
      >,
    );
    mockEventBuilder.addProperties.mockReturnValue(
      mockEventBuilder as unknown as ReturnType<
        typeof MetricsEventBuilder.createEventBuilder
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
    });

    it('handles special characters and formatting', () => {
      const specialCharErrors = [
        `Error: ${VAULT_ERROR}`,
        `[${VAULT_CREATION_ERROR}]`,
        `Failed - ${NO_VAULT_IN_BACKUP_ERROR}`,
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

    it('tracks vault-related errors when MetaMetrics is enabled', () => {
      // Given: MetaMetrics is enabled and we have a vault error
      mockMetaMetricsInstance.isEnabled.mockReturnValue(true);
      const errorMessage = VAULT_ERROR;

      // When: tracking vault corruption
      trackVaultCorruption(errorMessage, mockProperties);

      // Then: should create event and track it
      expect(mockedMetricsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.VAULT_CORRUPTION_DETECTED,
      );
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        error_message: errorMessage,
        ...mockProperties,
      });
      expect(mockMetaMetricsInstance.trackEvent).toHaveBeenCalledWith({
        event: 'test',
      });
    });

    it('does not track when MetaMetrics is disabled', () => {
      // Given: MetaMetrics is disabled
      mockMetaMetricsInstance.isEnabled.mockReturnValue(false);
      const errorMessage = VAULT_ERROR;

      // When: attempting to track vault corruption
      trackVaultCorruption(errorMessage, mockProperties);

      // Then: should not track the event
      expect(mockMetaMetricsInstance.trackEvent).not.toHaveBeenCalled();
      expect(
        mockedMetricsEventBuilder.createEventBuilder,
      ).not.toHaveBeenCalled();
    });

    it('does not track non-vault-related errors', () => {
      // Given: MetaMetrics is enabled but error is not vault-related
      mockMetaMetricsInstance.isEnabled.mockReturnValue(true);
      const errorMessage = 'Network request failed';

      // When: attempting to track non-vault error
      trackVaultCorruption(errorMessage, mockProperties);

      // Then: should not track the event
      expect(mockMetaMetricsInstance.trackEvent).not.toHaveBeenCalled();
      expect(
        mockedMetricsEventBuilder.createEventBuilder,
      ).not.toHaveBeenCalled();
    });

    it('handles tracking errors gracefully', () => {
      // Given: MetaMetrics throws an error
      mockMetaMetricsInstance.isEnabled.mockReturnValue(true);
      mockMetaMetricsInstance.trackEvent.mockImplementation(() => {
        throw new Error('Tracking failed');
      });
      const errorMessage = VAULT_ERROR;

      // When: tracking vault corruption
      expect(() => {
        trackVaultCorruption(errorMessage, mockProperties);
      }).not.toThrow();

      // Then: should log the error
      expect(mockedLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Error tracking vault corruption event - analytics tracking failed',
      );
    });

    it('handles MetaMetrics getInstance errors gracefully', () => {
      // Given: MetaMetrics.getInstance throws an error
      mockedMetaMetrics.getInstance.mockImplementation(() => {
        throw new Error('getInstance failed');
      });
      const errorMessage = VAULT_ERROR;

      // When: tracking vault corruption
      expect(() => {
        trackVaultCorruption(errorMessage, mockProperties);
      }).not.toThrow();

      // Then: should log the error
      expect(mockedLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Error tracking vault corruption event - analytics tracking failed',
      );
    });

    it('passes additional properties correctly', () => {
      // Given: MetaMetrics is enabled and we have additional properties
      mockMetaMetricsInstance.isEnabled.mockReturnValue(true);
      const errorMessage = VAULT_ERROR;
      const additionalProps = {
        ...mockProperties,
        migration_version: '35',
        user_id: 'test-user',
      };

      // When: tracking vault corruption with additional properties
      trackVaultCorruption(errorMessage, additionalProps);

      // Then: should include all properties
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        error_message: errorMessage,
        ...additionalProps,
      });
    });

    it.each([
      VAULT_ERROR,
      VAULT_CREATION_ERROR,
      NO_VAULT_IN_BACKUP_ERROR,
    ] as const)('tracks all vault error types: %s', (errorConstant) => {
      // Given: MetaMetrics is enabled
      mockMetaMetricsInstance.isEnabled.mockReturnValue(true);

      // When: tracking this specific vault error
      trackVaultCorruption(errorConstant, mockProperties);

      // Then: should track the event
      expect(mockMetaMetricsInstance.trackEvent).toHaveBeenCalledWith({
        event: 'test',
      });
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        error_message: errorConstant,
        ...mockProperties,
      });
    });
  });
});
