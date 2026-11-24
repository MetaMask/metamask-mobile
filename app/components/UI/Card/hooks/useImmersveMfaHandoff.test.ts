import { renderHook } from '@testing-library/react-native';
import {
  CardProviderErrorCode,
  type CardAuthResult,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { CardEntryPoint } from '../util/metrics';
import {
  useImmersveMfaHandoff,
  type ImmersveMfaHandoffParams,
} from './useImmersveMfaHandoff';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const params: ImmersveMfaHandoffParams = {
  country: 'GB',
  address: '0xabc',
  continuation: { entrypoint: CardEntryPoint.AUTHENTICATION },
};

describe('useImmersveMfaHandoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the method screen for a method-selection step', () => {
    const { result } = renderHook(() => useImmersveMfaHandoff());
    const authResult: CardAuthResult = {
      done: false,
      nextStep: {
        type: 'mfa_select',
        options: [{ method: 'phone', maskedDestination: '+64 *****1234' }],
      },
    };

    expect(result.current(authResult, params)).toBe(true);

    expect(mockNavigate).toHaveBeenCalledWith(
      'CardMfaMethod',
      expect.objectContaining({
        country: 'GB',
        options: [{ method: 'phone', maskedDestination: '+64 *****1234' }],
      }),
    );
  });

  it('opens the code screen for a code step', () => {
    const { result } = renderHook(() => useImmersveMfaHandoff());
    const authResult: CardAuthResult = {
      done: false,
      nextStep: {
        type: 'mfa_code',
        method: 'email',
        maskedDestination: 'j***@example.com',
        expiresAt: null,
      },
    };

    expect(result.current(authResult, params)).toBe(true);

    expect(mockNavigate).toHaveBeenCalledWith(
      'CardMfaCode',
      expect.objectContaining({
        method: 'email',
        maskedDestination: 'j***@example.com',
        options: [{ method: 'email', maskedDestination: 'j***@example.com' }],
      }),
    );
  });

  it('returns false for a finished login', () => {
    const { result } = renderHook(() => useImmersveMfaHandoff());

    expect(result.current({ done: true }, params)).toBe(false);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('throws when the login is not finished and has no MFA step', () => {
    const { result } = renderHook(() => useImmersveMfaHandoff());

    expect(() => result.current({ done: false }, params)).toThrow(
      expect.objectContaining({ code: CardProviderErrorCode.Unknown }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
