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
