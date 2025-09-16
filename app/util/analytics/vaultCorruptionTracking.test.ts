import { isVaultRelatedError } from './vaultCorruptionTracking';
import {
  AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
  VAULT_CREATION_ERROR,
  NO_VAULT_IN_BACKUP_ERROR,
} from '../../constants/error';
import { VAULT_ERROR } from '../../components/Views/Login/constants';

describe('vaultCorruptionTracking', () => {
  describe('isVaultRelatedError', () => {
    describe('should return true for vault-related errors', () => {
      it('should detect migration vault errors', () => {
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

      it('should detect vault creation and backup errors', () => {
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

      it('should detect vault unlock errors', () => {
        const vaultUnlockErrors = [
          VAULT_ERROR,
          `Error: ${VAULT_ERROR}`,
          `Failed with: ${VAULT_ERROR}`,
        ];

        vaultUnlockErrors.forEach((errorMessage) => {
          expect(isVaultRelatedError(errorMessage)).toBe(true);
        });
      });

      it('should detect system authentication failures', () => {
        const systemAuthErrors = [
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
          `Error: ${AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS}`,
          `Failed with: ${AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS}`,
        ];

        systemAuthErrors.forEach((errorMessage) => {
          expect(isVaultRelatedError(errorMessage)).toBe(true);
        });
      });

      it('should be case insensitive for all patterns', () => {
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
        expect(
          isVaultRelatedError(NO_VAULT_IN_BACKUP_ERROR.toUpperCase()),
        ).toBe(true);
      });

      it('should detect patterns within longer error messages', () => {
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
    });

    describe('should return false for non-vault-related errors', () => {
      it('should not detect network errors', () => {
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

      it('should not detect UI/component errors', () => {
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

      it('should not detect validation errors', () => {
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

      it('should not detect generic errors', () => {
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

      it('should return false for empty or whitespace strings', () => {
        const emptyStrings = ['', ' ', '   ', '\t', '\n', '\r\n'];

        emptyStrings.forEach((errorMessage) => {
          expect(isVaultRelatedError(errorMessage)).toBe(false);
        });
      });

      it('should not match similar but different error patterns', () => {
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
    });

    describe('actual error constants testing', () => {
      it('should detect all imported error constants', () => {
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
    });

    describe('edge cases', () => {
      it('should handle special characters and formatting', () => {
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

      it('should handle unicode characters', () => {
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

      it('should handle very long error messages', () => {
        const longError = 'A'.repeat(1000) + VAULT_ERROR + 'B'.repeat(1000);
        expect(isVaultRelatedError(longError)).toBe(true);

        const longNonVaultError = 'A'.repeat(2000);
        expect(isVaultRelatedError(longNonVaultError)).toBe(false);
      });

      it('should handle multiple pattern matches', () => {
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

    describe('performance', () => {
      it('should handle large number of calls efficiently', () => {
        const startTime = Date.now();
        const iterations = 10000;

        for (let i = 0; i < iterations; i++) {
          isVaultRelatedError(VAULT_ERROR);
          isVaultRelatedError('regular error test');
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should complete 10k iterations in reasonable time (< 100ms)
        expect(duration).toBeLessThan(100);
      });
    });
  });
});
