import {
  handleRewardsErrorMessage,
  SOLANA_SIGNUP_NOT_SUPPORTED,
} from './utils';

describe('Rewards Utils', () => {
  describe('SOLANA_SIGNUP_NOT_SUPPORTED constant', () => {
    it('should export the correct message for Solana signup not supported', () => {
      // Arrange & Act & Assert
      expect(SOLANA_SIGNUP_NOT_SUPPORTED).toBe(
        'Signing in to Rewards with Solana accounts is not supported yet. Please use an Ethereum account instead.',
      );
    });
  });

  describe('handleRewardsErrorMessage', () => {
    describe('when error is not an object', () => {
      it('should return default error message for null error', () => {
        // Arrange
        const error = null;

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('Something went wrong. Please try again shortly.');
      });

      it('should return default error message for string error', () => {
        // Arrange
        const error = 'some string error';

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('Something went wrong. Please try again shortly.');
      });

      it('should return default error message for number error', () => {
        // Arrange
        const error = 123;

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('Something went wrong. Please try again shortly.');
      });

      it('should return default error message for boolean error', () => {
        // Arrange
        const error = true;

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('Something went wrong. Please try again shortly.');
      });
    });

    describe('when error object has no message', () => {
      it('should return default error message for empty object', () => {
        // Arrange
        const error = {};

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('Something went wrong. Please try again shortly.');
      });

      it('should return default error message when both data.message and message are undefined', () => {
        // Arrange
        const error = { someOtherProperty: 'value' };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('Something went wrong. Please try again shortly.');
      });

      it('should return default error message when data.message is empty string', () => {
        // Arrange
        const error = { data: { message: '' } };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('Something went wrong. Please try again shortly.');
      });
    });

    describe('when error contains "already registered"', () => {
      it('should return account already registered message for data.message', () => {
        // Arrange
        const error = {
          data: { message: 'User is already registered with this account' },
        };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(
          'This account is already registered with another Rewards profile. Please switch account to continue.',
        );
      });

      it('should return account already registered message for direct message', () => {
        // Arrange
        const error = { message: 'Account already registered in system' };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(
          'This account is already registered with another Rewards profile. Please switch account to continue.',
        );
      });
    });

    describe('when error contains "rejected the request"', () => {
      it('should return rejection message for data.message', () => {
        // Arrange
        const error = {
          data: { message: 'User rejected the request from the application' },
        };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('You rejected the request.');
      });

      it('should return rejection message for direct message', () => {
        // Arrange
        const error = { message: 'The user rejected the request' };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('You rejected the request.');
      });
    });

    describe('when error contains "No keyring found"', () => {
      it('should return Solana not supported message for data.message', () => {
        // Arrange
        const error = {
          data: { message: 'No keyring found for this account' },
        };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(SOLANA_SIGNUP_NOT_SUPPORTED);
      });

      it('should return Solana not supported message for direct message', () => {
        // Arrange
        const error = { message: 'No keyring found' };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(SOLANA_SIGNUP_NOT_SUPPORTED);
      });
    });

    describe('when error contains service unavailable indicators', () => {
      it('should return service unavailable message for "not available"', () => {
        // Arrange
        const error = { data: { message: 'Service not available' } };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(
          'Service is not available at the moment. Please try again shortly.',
        );
      });

      it('should return service unavailable message for "Network request failed"', () => {
        // Arrange
        const error = { message: 'Network request failed due to timeout' };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(
          'Service is not available at the moment. Please try again shortly.',
        );
      });
    });

    describe('when error has custom message not matching specific cases', () => {
      it('should return the original message from data.message', () => {
        // Arrange
        const customMessage = 'Custom API error occurred';
        const error = { data: { message: customMessage } };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(customMessage);
      });

      it('should return the original message from direct message', () => {
        // Arrange
        const customMessage = 'Validation failed for input';
        const error = { message: customMessage };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(customMessage);
      });

      it('should prioritize data.message over direct message', () => {
        // Arrange
        const dataMessage = 'Error from data.message';
        const directMessage = 'Error from message';
        const error = {
          data: { message: dataMessage },
          message: directMessage,
        };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(dataMessage);
      });

      it('should fall back to direct message when data.message is undefined', () => {
        // Arrange
        const directMessage = 'Error from direct message';
        const error = {
          data: {},
          message: directMessage,
        };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe(directMessage);
      });
    });

    describe('error message matching is case sensitive', () => {
      it('should not match "ALREADY REGISTERED" in uppercase', () => {
        // Arrange
        const error = { message: 'USER ALREADY REGISTERED' };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('USER ALREADY REGISTERED');
      });

      it('should not match "REJECTED THE REQUEST" in uppercase', () => {
        // Arrange
        const error = { message: 'USER REJECTED THE REQUEST' };

        // Act
        const result = handleRewardsErrorMessage(error);

        // Assert
        expect(result).toBe('USER REJECTED THE REQUEST');
      });
    });
  });
});
