import { getCardProviderErrorMessage } from './getCardProviderErrorMessage';
import {
  CardProviderError,
  CardProviderErrorCode,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { strings } from '../../../../../locales/i18n';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn(),
}));

const mockStrings = strings as jest.MockedFunction<typeof strings>;

describe('getCardProviderErrorMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStrings.mockImplementation((key: string) => `mocked_${key}`);
  });

  describe('CardProviderError handling', () => {
    const cardProviderErrorTestCases = [
      {
        code: CardProviderErrorCode.InvalidCredentials,
        expectedStringKey:
          'card.card_authentication.errors.invalid_credentials',
        description: 'InvalidCredentials',
      },
      {
        code: CardProviderErrorCode.InvalidOtp,
        expectedStringKey: 'card.card_authentication.errors.invalid_otp_code',
        description: 'InvalidOtp',
      },
      {
        code: CardProviderErrorCode.Network,
        expectedStringKey: 'card.card_authentication.errors.network_error',
        description: 'Network',
      },
      {
        code: CardProviderErrorCode.Timeout,
        expectedStringKey: 'card.card_authentication.errors.timeout_error',
        description: 'Timeout',
      },
      {
        code: CardProviderErrorCode.ServerError,
        expectedStringKey: 'card.card_authentication.errors.server_error',
        description: 'ServerError',
      },
      {
        code: CardProviderErrorCode.Unknown,
        expectedStringKey: 'card.card_authentication.errors.unknown_error',
        description: 'Unknown',
      },
    ] as const;

    it.each(cardProviderErrorTestCases)(
      'returns correct localized message for $description',
      ({ code, expectedStringKey }) => {
        const error = new CardProviderError(code, 'Test error message');

        const result = getCardProviderErrorMessage(error);

        expect(mockStrings).toHaveBeenCalledWith(expectedStringKey);
        expect(result).toBe(`mocked_${expectedStringKey}`);
      },
    );

    it('returns the forbidden message with the machine code appended', () => {
      const error = new CardProviderError(
        CardProviderErrorCode.Forbidden,
        'Forbidden on createFundingSource',
        403,
        'FUNDING_SOURCE_EXISTS',
      );

      const result = getCardProviderErrorMessage(error);

      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.forbidden_error',
      );
      expect(result).toBe(
        'mocked_card.card_authentication.errors.forbidden_error (FUNDING_SOURCE_EXISTS)',
      );
    });

    it('returns the forbidden message without a suffix when no code is present', () => {
      const error = new CardProviderError(
        CardProviderErrorCode.Forbidden,
        'Forbidden',
        403,
      );

      const result = getCardProviderErrorMessage(error);

      expect(result).toBe(
        'mocked_card.card_authentication.errors.forbidden_error',
      );
    });

    it('returns MFA copy for destination, code, and restart errors', () => {
      const cases = [
        {
          error: new CardProviderError(
            CardProviderErrorCode.MfaDestinationMismatch,
            'mismatch',
            403,
            'MFA_METHOD_MISMATCH',
          ),
          key: 'card.mfa.errors.destination_mismatch',
        },
        {
          error: new CardProviderError(
            CardProviderErrorCode.InvalidOtp,
            'bad code',
            403,
            'MFA_CODE_INVALID',
          ),
          key: 'card.mfa.errors.invalid_code',
        },
        {
          error: new CardProviderError(
            CardProviderErrorCode.AuthRestartRequired,
            'expired',
            403,
            'MFA_CODE_EXPIRED',
          ),
          key: 'card.mfa.errors.code_expired',
        },
        {
          error: new CardProviderError(
            CardProviderErrorCode.AuthRestartRequired,
            'locked',
            403,
            'MFA_ATTEMPTS_EXCEEDED',
          ),
          key: 'card.mfa.errors.attempts_exceeded',
        },
        {
          error: new CardProviderError(
            CardProviderErrorCode.AuthRestartRequired,
            'No verified contact is available for verification',
            undefined,
            'NO_VERIFIED_CONTACT',
          ),
          key: 'card.mfa.errors.no_verified_contact',
        },
      ];

      for (const { error, key } of cases) {
        expect(getCardProviderErrorMessage(error)).toBe(`mocked_${key}`);
      }
    });

    it('returns original message for AccountDisabled', () => {
      const customMessage = 'Account has been disabled';
      const error = new CardProviderError(
        CardProviderErrorCode.AccountDisabled,
        customMessage,
      );

      const result = getCardProviderErrorMessage(error);

      expect(mockStrings).not.toHaveBeenCalled();
      expect(result).toBe(customMessage);
    });
  });

  describe('Non-CardProviderError handling', () => {
    it('returns unknown error for generic Error', () => {
      const error = new Error('Generic error');

      const result = getCardProviderErrorMessage(error);

      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.unknown_error',
      );
      expect(result).toBe(
        'mocked_card.card_authentication.errors.unknown_error',
      );
    });

    it('returns unknown error for null', () => {
      const result = getCardProviderErrorMessage(null);

      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.unknown_error',
      );
      expect(result).toBe(
        'mocked_card.card_authentication.errors.unknown_error',
      );
    });

    it('returns unknown error for undefined', () => {
      const result = getCardProviderErrorMessage(undefined);

      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.unknown_error',
      );
      expect(result).toBe(
        'mocked_card.card_authentication.errors.unknown_error',
      );
    });
  });
});
