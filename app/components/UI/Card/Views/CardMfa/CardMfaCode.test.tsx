import React from 'react';
import { AppState } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  CardProviderError,
  CardProviderErrorCode,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { CardEntryPoint } from '../../util/metrics';
import CardMfaCode from './CardMfaCode';
import type { CardMfaCodeParams } from './types';

const mockSubmitCredentials = jest.fn();
const mockAuthenticateWithWallet = jest.fn();
const mockAbandonAuth = jest.fn();
jest.mock('../../../../../core/Engine', () => ({
  context: {
    CardController: {
      submitCredentials: (...args: unknown[]) => mockSubmitCredentials(...args),
      authenticateWithWallet: (...args: unknown[]) =>
        mockAuthenticateWithWallet(...args),
      abandonAuth: () => mockAbandonAuth(),
    },
  },
}));

const mockResume = jest.fn();
jest.mock('../../hooks/useImmersveResumeOnboarding', () => ({
  useImmersveResumeOnboarding: () => mockResume,
}));

const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    replace: mockReplace,
    addListener: () => jest.fn(),
    isFocused: () => true,
  }),
}));

const mockParams: { current: CardMfaCodeParams } = {
  current: {
    country: 'NZ',
    address: '0xabc',
    options: [{ method: 'email', maskedDestination: 'j***@example.com' }],
    continuation: {
      entrypoint: CardEntryPoint.SIGN_UP,
      email: 'jane@example.com',
      navigateFromRoot: true,
    },
    method: 'email',
    maskedDestination: 'j***@example.com',
    expiresAt: null,
  },
};
jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockParams.current,
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: () => ({
      addProperties: () => ({ build: () => ({}) }),
    }),
  }),
}));

jest.mock('../../../../hooks/useScreenTransitionComplete', () => ({
  __esModule: true,
  default: () => true,
}));

jest.mock('../../components/Onboarding/OnboardingStep', () => {
  const { View, Text } = jest.requireActual('react-native');
  return ({
    title,
    description,
    formFields,
    actions,
  }: {
    title: string;
    description?: string;
    formFields: React.ReactNode;
    actions: React.ReactNode;
  }) => (
    <View>
      <Text>{title}</Text>
      <Text>{description}</Text>
      {formFields}
      {actions}
    </View>
  );
});

describe('CardMfaCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.current = {
      country: 'NZ',
      address: '0xabc',
      options: [{ method: 'email', maskedDestination: 'j***@example.com' }],
      continuation: {
        entrypoint: CardEntryPoint.SIGN_UP,
        email: 'jane@example.com',
        navigateFromRoot: true,
      },
      method: 'email',
      maskedDestination: 'j***@example.com',
      expiresAt: null,
    };
  });

  it('auto-submits six digits once and resumes with the session already authenticated', async () => {
    mockSubmitCredentials.mockResolvedValue({ done: true });
    const { getByTestId } = render(<CardMfaCode />);

    fireEvent.changeText(getByTestId('otp-code-field'), '123456');
    fireEvent.changeText(getByTestId('otp-code-field'), '123456');

    await waitFor(() => {
      expect(mockSubmitCredentials).toHaveBeenCalledTimes(1);
    });
    expect(mockSubmitCredentials).toHaveBeenCalledWith({
      type: 'mfa_code',
      code: '123456',
    });
    expect(mockResume).toHaveBeenCalledWith(
      expect.objectContaining({
        alreadyAuthenticated: true,
        country: 'NZ',
        address: '0xabc',
        email: 'jane@example.com',
        entrypoint: CardEntryPoint.SIGN_UP,
        navigateFromRoot: true,
      }),
    );
  });

  it('shows an inline error and clears an invalid code', async () => {
    mockSubmitCredentials.mockRejectedValueOnce(
      new CardProviderError(
        CardProviderErrorCode.InvalidOtp,
        'bad',
        403,
        'MFA_CODE_INVALID',
      ),
    );
    const { getByTestId, findByTestId } = render(<CardMfaCode />);

    fireEvent.changeText(getByTestId('otp-code-field'), '000000');

    expect(await findByTestId('otp-code-field-error')).toHaveTextContent(
      'card.mfa.errors.invalid_code',
    );
    expect(getByTestId('otp-code-field')).toHaveProp('value', '');

    mockSubmitCredentials.mockResolvedValueOnce({ done: true });
    fireEvent.changeText(getByTestId('otp-code-field'), '654321');

    await waitFor(() => {
      expect(mockSubmitCredentials).toHaveBeenCalledWith({
        type: 'mfa_code',
        code: '654321',
      });
    });
  });

  it('starts over when the code is expired or attempts are exceeded', async () => {
    mockSubmitCredentials.mockRejectedValue(
      new CardProviderError(
        CardProviderErrorCode.AuthRestartRequired,
        'locked',
        403,
        'MFA_ATTEMPTS_EXCEEDED',
      ),
    );
    mockAuthenticateWithWallet.mockResolvedValue({
      done: false,
      nextStep: {
        type: 'mfa_select',
        options: [{ method: 'email', maskedDestination: 'j***@example.com' }],
      },
    });

    const { getByTestId, findByTestId } = render(<CardMfaCode />);
    fireEvent.changeText(getByTestId('otp-code-field'), '111111');

    expect(await findByTestId('card-mfa-code-expired')).toHaveTextContent(
      'card.mfa.errors.attempts_exceeded',
    );

    fireEvent.press(getByTestId('card-mfa-code-start-over'));

    await waitFor(() => {
      expect(mockAuthenticateWithWallet).toHaveBeenCalledWith({
        option: { providerId: 'immersve', method: 'siwe' },
        address: '0xabc',
        country: 'NZ',
        autoSignup: false,
      });
    });
    expect(mockReplace).toHaveBeenCalledWith(
      'CardMfaMethod',
      expect.objectContaining({
        options: [{ method: 'email', maskedDestination: 'j***@example.com' }],
      }),
    );
  });

  it('expires when the app returns to the foreground after expiresAt', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    let onChange: ((state: string) => void) | undefined;
    const appStateSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation(((type: string, handler: (state: string) => void) => {
        if (type === 'change') onChange = handler;
        return { remove: jest.fn() };
      }) as typeof AppState.addEventListener);
    mockParams.current = { ...mockParams.current, expiresAt: 5_000 };

    try {
      const { queryByTestId } = render(<CardMfaCode />);
      expect(queryByTestId('card-mfa-code-expired')).toBeNull();

      now.mockReturnValue(5_000);
      act(() => {
        onChange?.('active');
      });

      expect(queryByTestId('card-mfa-code-expired')).toHaveTextContent(
        'card.mfa.errors.code_expired',
      );
    } finally {
      now.mockRestore();
      appStateSpy.mockRestore();
    }
  });
});
