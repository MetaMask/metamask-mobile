import { getErrorMessage } from './getErrorMessage';
import { CardError, CardErrorType } from '../types';
import { strings } from '../../../../../locales/i18n';

// Mock the strings function
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn(),
}));

const mockStrings = strings as jest.MockedFunction<typeof strings>;

describe('getErrorMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock implementation
    mockStrings.mockImplementation((key: string) => `mocked_${key}`);
  });

  describe('CardError handling', () => {
    const cardErrorTestCases = [
      {
        errorType: CardErrorType.NETWORK_ERROR,
        expectedStringKey: 'card.card_authentication.errors.network_error',
        description: 'NETWORK_ERROR',
      },
      {
        errorType: CardErrorType.TIMEOUT_ERROR,
        expectedStringKey: 'card.card_authentication.errors.timeout_error',
        description: 'TIMEOUT_ERROR',
      },
      {
        errorType: CardErrorType.API_KEY_MISSING,
        expectedStringKey:
          'card.card_authentication.errors.configuration_error',
        description: 'API_KEY_MISSING',
      },
      {
        errorType: CardErrorType.VALIDATION_ERROR,
        expectedStringKey:
          'card.card_authentication.errors.invalid_email_or_password',
        description: 'VALIDATION_ERROR',
      },
      {
        errorType: CardErrorType.SERVER_ERROR,
        expectedStringKey: 'card.card_authentication.errors.server_error',
        description: 'SERVER_ERROR',
      },
      {
        errorType: CardErrorType.UNKNOWN_ERROR,
        expectedStringKey: 'card.card_authentication.errors.unknown_error',
        description: 'UNKNOWN_ERROR',
      },
    ] as const;

    it.each(cardErrorTestCases)(
      'should return correct localized message for $description',
      ({ errorType, expectedStringKey }) => {
        // Given: A CardError with specific type
        const cardError = new CardError(errorType, 'Test error message');

        // When: getErrorMessage is called
        const result = getErrorMessage(cardError);

        // Then: Should return the correct localized string
        expect(mockStrings).toHaveBeenCalledWith(expectedStringKey);
        expect(result).toBe(`mocked_${expectedStringKey}`);
      },
    );

    it('should handle CardError with custom message', () => {
      // Given: A CardError with custom message
      const customMessage = 'Custom error message';
      const cardError = new CardError(
        CardErrorType.NETWORK_ERROR,
        customMessage,
      );

      // When: getErrorMessage is called
      const result = getErrorMessage(cardError);

      // Then: Should return localized string (not the custom message)
      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.network_error',
      );
      expect(result).toBe(
        'mocked_card.card_authentication.errors.network_error',
      );
    });
  });

  describe('CONFLICT_ERROR specific message handling', () => {
    const conflictErrorTestCases = [
      {
        errorMessage: 'Email already exists',
        expectedStringKey: 'card.card_onboarding.errors.email_already_exists',
        description: 'email already exists message',
      },
      {
        errorMessage: 'Invalid email format',
        expectedStringKey: 'card.card_onboarding.errors.invalid_email_format',
        description: 'invalid email format message',
      },
      {
        errorMessage: 'no valid verification code',
        expectedStringKey:
          'card.card_onboarding.errors.invalid_verification_code',
        description: 'invalid verification code message',
      },
      {
        errorMessage: 'Verification code has expired',
        expectedStringKey:
          'card.card_onboarding.errors.verification_code_expired',
        description: 'verification code expired message',
      },
      {
        errorMessage: 'Invalid or expired contact verification ID',
        expectedStringKey:
          'card.card_onboarding.errors.invalid_contact_verification_id',
        description: 'invalid contact verification ID message',
      },
      {
        errorMessage: 'Invalid phone number format',
        expectedStringKey: 'card.card_onboarding.errors.invalid_phone_format',
        description: 'invalid phone format message',
      },
      {
        errorMessage: 'Phone number already exists',
        expectedStringKey: 'card.card_onboarding.errors.phone_already_exists',
        description: 'phone already exists message',
      },
      {
        errorMessage: 'Phone number does not match verification session',
        expectedStringKey: 'card.card_onboarding.errors.phone_number_mismatch',
        description: 'phone number mismatch message',
      },
      {
        errorMessage: 'Invalid zip code format',
        expectedStringKey: 'card.card_onboarding.errors.invalid_zip_code',
        description: 'invalid zip code message',
      },
      {
        errorMessage: 'US state is required',
        expectedStringKey: 'card.card_onboarding.errors.us_state_required',
        description: 'US state required message',
      },
      {
        errorMessage: 'already linked to a user',
        expectedStringKey: 'card.card_onboarding.errors.consent_already_linked',
        description: 'consent already linked message',
      },
      {
        errorMessage: 'Onboarding ID not found',
        expectedStringKey: 'card.card_onboarding.errors.invalid_onboarding_id',
        description: 'invalid onboarding ID message',
      },
      {
        errorMessage: 'Create user failed',
        expectedStringKey: 'card.card_onboarding.errors.create_user_failed',
        description: 'create user failed message',
      },
    ] as const;

    it.each(conflictErrorTestCases)(
      'should return correct localized message for CONFLICT_ERROR with $description',
      ({ errorMessage, expectedStringKey }) => {
        // Given: A CONFLICT_ERROR with specific message
        const cardError = new CardError(
          CardErrorType.CONFLICT_ERROR,
          errorMessage,
        );

        // When: getErrorMessage is called
        const result = getErrorMessage(cardError);

        // Then: Should return the specific localized string
        expect(mockStrings).toHaveBeenCalledWith(expectedStringKey);
        expect(result).toBe(`mocked_${expectedStringKey}`);
      },
    );

    it('should return original message for CONFLICT_ERROR with unrecognized message', () => {
      // Given: A CONFLICT_ERROR with unrecognized message
      const unrecognizedMessage = 'Some unrecognized conflict error message';
      const cardError = new CardError(
        CardErrorType.CONFLICT_ERROR,
        unrecognizedMessage,
      );

      // When: getErrorMessage is called
      const result = getErrorMessage(cardError);

      // Then: Should return the original error message
      expect(result).toBe(unrecognizedMessage);
    });
  });

  describe('Non-CardError handling', () => {
    it('should handle generic Error instances', () => {
      // Given: A generic Error instance
      const genericError = new Error('Generic error message');

      // When: getErrorMessage is called
      const result = getErrorMessage(genericError);

      // Then: Should return unknown error message
      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.unknown_error',
      );
      expect(result).toBe(
        'mocked_card.card_authentication.errors.unknown_error',
      );
    });

    it('should handle string errors', () => {
      // Given: A string error
      const stringError = 'String error message';

      // When: getErrorMessage is called
      const result = getErrorMessage(stringError);

      // Then: Should return unknown error message
      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.unknown_error',
      );
      expect(result).toBe(
        'mocked_card.card_authentication.errors.unknown_error',
      );
    });

    it('should handle null errors', () => {
      // Given: A null error
      const nullError = null;

      // When: getErrorMessage is called
      const result = getErrorMessage(nullError);

      // Then: Should return unknown error message
      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.unknown_error',
      );
      expect(result).toBe(
        'mocked_card.card_authentication.errors.unknown_error',
      );
    });

    it('should handle undefined errors', () => {
      // Given: An undefined error
      const undefinedError = undefined;

      // When: getErrorMessage is called
      const result = getErrorMessage(undefinedError);

      // Then: Should return unknown error message
      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.unknown_error',
      );
      expect(result).toBe(
        'mocked_card.card_authentication.errors.unknown_error',
      );
    });

    it('should handle object errors without CardError type', () => {
      // Given: An object error that is not a CardError
      const objectError = { message: 'Object error', code: 500 };

      // When: getErrorMessage is called
      const result = getErrorMessage(objectError);

      // Then: Should return unknown error message
      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.unknown_error',
      );
      expect(result).toBe(
        'mocked_card.card_authentication.errors.unknown_error',
      );
    });

    it('should handle number errors', () => {
      // Given: A number error
      const numberError = 404;

      // When: getErrorMessage is called
      const result = getErrorMessage(numberError);

      // Then: Should return unknown error message
      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.unknown_error',
      );
      expect(result).toBe(
        'mocked_card.card_authentication.errors.unknown_error',
      );
    });

    it('should handle boolean errors', () => {
      // Given: A boolean error
      const booleanError = false;

      // When: getErrorMessage is called
      const result = getErrorMessage(booleanError);

      // Then: Should return unknown error message
      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.unknown_error',
      );
      expect(result).toBe(
        'mocked_card.card_authentication.errors.unknown_error',
      );
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle CardError with very long message', () => {
      // Given: A CardError with very long message
      const longMessage = 'A'.repeat(1000);
      const cardError = new CardError(
        CardErrorType.VALIDATION_ERROR,
        longMessage,
      );

      // When: getErrorMessage is called
      const result = getErrorMessage(cardError);

      // Then: Should return localized string regardless of message length
      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.invalid_email_or_password',
      );
      expect(result).toBe(
        'mocked_card.card_authentication.errors.invalid_email_or_password',
      );
    });

    it('should handle CardError with special characters in message', () => {
      // Given: A CardError with special characters
      const specialMessage = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const cardError = new CardError(
        CardErrorType.SERVER_ERROR,
        specialMessage,
      );

      // When: getErrorMessage is called
      const result = getErrorMessage(cardError);

      // Then: Should return localized string
      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.server_error',
      );
      expect(result).toBe(
        'mocked_card.card_authentication.errors.server_error',
      );
    });

    it('should handle CardError with unicode characters in message', () => {
      // Given: A CardError with unicode characters
      const unicodeMessage = '测试错误消息 🚫 ñáéíóú';
      const cardError = new CardError(
        CardErrorType.NETWORK_ERROR,
        unicodeMessage,
      );

      // When: getErrorMessage is called
      const result = getErrorMessage(cardError);

      // Then: Should return localized string
      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.network_error',
      );
      expect(result).toBe(
        'mocked_card.card_authentication.errors.network_error',
      );
    });

    it('should handle multiple calls with same error', () => {
      // Given: A CardError
      const cardError = new CardError(
        CardErrorType.TIMEOUT_ERROR,
        'Test message',
      );

      // When: getErrorMessage is called multiple times
      const result1 = getErrorMessage(cardError);
      const result2 = getErrorMessage(cardError);
      const result3 = getErrorMessage(cardError);

      // Then: Should return consistent results
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(mockStrings).toHaveBeenCalledTimes(3);
      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.timeout_error',
      );
    });

    it('should handle strings function returning different values', () => {
      // Given: strings function returns different values
      mockStrings.mockReturnValueOnce('First call result');
      mockStrings.mockReturnValueOnce('Second call result');

      const cardError1 = new CardError(CardErrorType.API_KEY_MISSING, 'Test 1');
      const cardError2 = new CardError(CardErrorType.API_KEY_MISSING, 'Test 2');

      // When: getErrorMessage is called with same error type
      const result1 = getErrorMessage(cardError1);
      const result2 = getErrorMessage(cardError2);

      // Then: Should return different values as per strings function
      expect(result1).toBe('First call result');
      expect(result2).toBe('Second call result');
    });

    it('should handle CONFLICT_ERROR with partial message matches', () => {
      // Given: A CONFLICT_ERROR with message containing recognized substring
      const partialMessage = 'The Email already exists in our system';
      const cardError = new CardError(
        CardErrorType.CONFLICT_ERROR,
        partialMessage,
      );

      // When: getErrorMessage is called
      const result = getErrorMessage(cardError);

      // Then: Should return the specific localized string for email exists
      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_onboarding.errors.email_already_exists',
      );
      expect(result).toBe(
        'mocked_card.card_onboarding.errors.email_already_exists',
      );
    });
  });
});
