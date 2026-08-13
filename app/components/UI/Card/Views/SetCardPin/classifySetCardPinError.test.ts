import {
  CardProviderError,
  CardProviderErrorCode,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { classifySetCardPinError } from './classifySetCardPinError';

describe('classifySetCardPinError', () => {
  it('classifies INVALID_PIN_FORMAT as invalid_pin', () => {
    expect(
      classifySetCardPinError(
        new CardProviderError(
          CardProviderErrorCode.Forbidden,
          'Forbidden',
          403,
          'INVALID_PIN_FORMAT',
        ),
      ),
    ).toBe('invalid_pin');
  });

  it('classifies CARD_SET_PIN_FORBIDDEN as forbidden', () => {
    expect(
      classifySetCardPinError(
        new CardProviderError(
          CardProviderErrorCode.Forbidden,
          'Forbidden',
          403,
          'CARD_SET_PIN_FORBIDDEN',
        ),
      ),
    ).toBe('forbidden');
  });

  it.each(['FORBIDDEN', 'LIVENESS_MISMATCH'])(
    'classifies %s as auth',
    (errorCode) => {
      expect(
        classifySetCardPinError(
          new CardProviderError(
            CardProviderErrorCode.Forbidden,
            'Forbidden',
            403,
            errorCode,
          ),
        ),
      ).toBe('auth');
    },
  );

  it('classifies 400 as invalid_pin', () => {
    expect(
      classifySetCardPinError(
        new CardProviderError(
          CardProviderErrorCode.Unknown,
          'Bad request',
          400,
        ),
      ),
    ).toBe('invalid_pin');
  });

  it('classifies network errors as retryable', () => {
    expect(
      classifySetCardPinError(
        new CardProviderError(CardProviderErrorCode.Network, 'offline', 0),
      ),
    ).toBe('retryable');
  });

  it('classifies unknown errors as unknown', () => {
    expect(classifySetCardPinError(new Error('boom'))).toBe('unknown');
  });
});
