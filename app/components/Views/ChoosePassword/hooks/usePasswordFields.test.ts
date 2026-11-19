import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { MIN_PASSWORD_LENGTH } from '../../../../util/password';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  confirmValidationShouldArm,
  getConfirmPasswordStatusMessage,
  getCreatePasswordDisabledHint,
  usePasswordFields,
} from './usePasswordFields';

const mockTrack = jest.fn();
jest.mock('./useOnboardingTrack', () => ({
  useOnboardingTrack: () => mockTrack,
}));

const VALID_PASSWORD = 'Test123456!';
const IDLE = { isLoading: false, isAwaitingGeolocation: false };

describe('usePasswordFields helpers', () => {
  it('arms confirm validation once the confirm value matches the password length and meets requirements', () => {
    expect(confirmValidationShouldArm(VALID_PASSWORD, VALID_PASSWORD)).toBe(
      true,
    );
    expect(confirmValidationShouldArm(VALID_PASSWORD, 'short')).toBe(false);
    expect(confirmValidationShouldArm('', '')).toBe(false);
  });

  it('returns the mismatch message when armed and passwords differ', () => {
    expect(
      getConfirmPasswordStatusMessage(
        VALID_PASSWORD,
        'Different123!',
        true,
        false,
      ),
    ).toBe(strings('choose_password.password_error'));
  });

  it('returns the length message after leaving a short confirm field', () => {
    expect(
      getConfirmPasswordStatusMessage(VALID_PASSWORD, 'short', false, true),
    ).toBe(
      strings('choose_password.must_be_at_least', {
        number: MIN_PASSWORD_LENGTH,
      }),
    );
  });

  it('returns no message when passwords match', () => {
    expect(
      getConfirmPasswordStatusMessage(
        VALID_PASSWORD,
        VALID_PASSWORD,
        true,
        true,
      ),
    ).toBeUndefined();
  });

  it('returns the length hint or the mismatch hint for a disabled CTA', () => {
    expect(getCreatePasswordDisabledHint('short', 'short')).toBe(
      strings('choose_password.must_be_at_least', {
        number: MIN_PASSWORD_LENGTH,
      }),
    );
    expect(getCreatePasswordDisabledHint(VALID_PASSWORD, 'Different123!')).toBe(
      strings('choose_password.password_error'),
    );
  });
});

describe('usePasswordFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts empty with both fields hidden', () => {
    const { result } = renderHook(() => usePasswordFields({}));

    expect(result.current.password).toBe('');
    expect(result.current.confirmPassword).toBe('');
    expect(result.current.showPasswordIndex).toEqual([0, 1]);
    expect(result.current.confirmPasswordStatusMessage).toBeUndefined();
  });

  it('arms confirm validation and reports a mismatch', () => {
    const { result } = renderHook(() => usePasswordFields({}));

    act(() => {
      result.current.onPasswordChange(VALID_PASSWORD);
    });
    act(() => {
      result.current.setConfirmPasswordValue('Test123456?');
    });

    expect(result.current.confirmValidationArmed).toBe(true);
    expect(result.current.confirmPasswordStatusMessage).toBe(
      strings('choose_password.password_error'),
    );
  });

  it('clears the confirm value and disarms validation when the password is cleared', () => {
    const { result } = renderHook(() => usePasswordFields({}));

    act(() => {
      result.current.onPasswordChange(VALID_PASSWORD);
    });
    act(() => {
      result.current.setConfirmPasswordValue(VALID_PASSWORD);
    });
    act(() => {
      result.current.leaveConfirmPasswordField();
    });
    act(() => {
      result.current.onPasswordChange('');
    });

    expect(result.current.confirmPassword).toBe('');
    expect(result.current.confirmValidationArmed).toBe(false);
    expect(result.current.hasLeftConfirmPasswordField).toBe(false);
  });

  it('marks the password field as left on jump to confirm', () => {
    const { result } = renderHook(() => usePasswordFields({}));

    act(() => {
      result.current.jumpToConfirmPassword();
    });

    expect(result.current.hasLeftPasswordField).toBe(true);
  });

  it('toggles password visibility per field', () => {
    const { result } = renderHook(() => usePasswordFields({}));

    act(() => {
      result.current.toggleShowPassword(0);
    });
    expect(result.current.showPasswordIndex).toEqual([1]);

    act(() => {
      result.current.toggleShowPassword(0);
    });
    expect(result.current.showPasswordIndex).toEqual([1, 0]);
  });

  it('arms validation when submitting a valid confirm value', () => {
    const { result } = renderHook(() => usePasswordFields({}));

    act(() => {
      result.current.onPasswordChange(`${VALID_PASSWORD}x`);
    });
    act(() => {
      result.current.setConfirmPasswordValue(VALID_PASSWORD);
    });
    expect(result.current.confirmValidationArmed).toBe(false);

    act(() => {
      result.current.submitConfirmPassword();
    });

    expect(result.current.hasLeftConfirmPasswordField).toBe(true);
    expect(result.current.confirmValidationArmed).toBe(true);
  });

  it('announces the confirm status message on iOS', () => {
    const originalOS = Platform.OS;
    Platform.OS = 'ios';
    const announceSpy = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    const { result } = renderHook(() => usePasswordFields({}));

    act(() => {
      result.current.onPasswordChange(VALID_PASSWORD);
    });
    act(() => {
      result.current.setConfirmPasswordValue('Test123456?');
    });

    expect(announceSpy).toHaveBeenCalledWith(
      strings('choose_password.password_error'),
    );
    announceSpy.mockRestore();
    Platform.OS = originalOS;
  });

  describe('validatePasswordSubmission', () => {
    it('tracks a length failure with the social account type', () => {
      const { result } = renderHook(() =>
        usePasswordFields({ provider: 'google' }),
      );

      act(() => {
        result.current.onPasswordChange('short');
      });

      expect(result.current.validatePasswordSubmission(IDLE)).toEqual({
        valid: false,
        shouldTrack: false,
      });
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.WALLET_SETUP_FAILURE,
        {
          wallet_setup_type: 'import',
          error_type: strings('choose_password.password_length_error'),
          account_type: 'metamask_google',
        },
      );
    });

    it('tracks a mismatch failure without an account type for SRP users', () => {
      const { result } = renderHook(() => usePasswordFields({}));

      act(() => {
        result.current.onPasswordChange(VALID_PASSWORD);
      });
      act(() => {
        result.current.setConfirmPasswordValue('Different123!');
      });

      expect(result.current.validatePasswordSubmission(IDLE).valid).toBe(false);
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.WALLET_SETUP_FAILURE,
        {
          wallet_setup_type: 'import',
          error_type: strings('choose_password.password_dont_match'),
        },
      );
    });

    it('rejects without tracking while loading or awaiting geolocation', () => {
      const { result } = renderHook(() => usePasswordFields({}));

      act(() => {
        result.current.onPasswordChange(VALID_PASSWORD);
      });
      act(() => {
        result.current.setConfirmPasswordValue(VALID_PASSWORD);
      });

      expect(
        result.current.validatePasswordSubmission({
          isLoading: true,
          isAwaitingGeolocation: false,
        }).valid,
      ).toBe(false);
      expect(
        result.current.validatePasswordSubmission({
          isLoading: false,
          isAwaitingGeolocation: true,
        }).valid,
      ).toBe(false);
      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('accepts matching valid passwords', () => {
      const { result } = renderHook(() => usePasswordFields({}));

      act(() => {
        result.current.onPasswordChange(VALID_PASSWORD);
      });
      act(() => {
        result.current.setConfirmPasswordValue(VALID_PASSWORD);
      });

      expect(result.current.validatePasswordSubmission(IDLE)).toEqual({
        valid: true,
        shouldTrack: true,
      });
    });
  });
});
