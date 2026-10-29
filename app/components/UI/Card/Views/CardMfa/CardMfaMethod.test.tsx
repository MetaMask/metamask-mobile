import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  CardProviderError,
  CardProviderErrorCode,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { CardEntryPoint } from '../../util/metrics';
import CardMfaMethod from './CardMfaMethod';
import type { CardMfaMethodParams } from './types';

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
const mockListeners: Record<
  string,
  (event: { data: { action: { type: string } } }) => void
> = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    replace: mockReplace,
    navigate: jest.fn(),
    addListener: (
      event: string,
      callback: (event: { data: { action: { type: string } } }) => void,
    ) => {
      mockListeners[event] = callback;
      return jest.fn();
    },
  }),
}));

const mockParams: { current: CardMfaMethodParams } = {
  current: {
    country: 'NZ',
    address: '0xabc',
    options: [
      { method: 'phone', maskedDestination: '+64 *****1234' },
      { method: 'email', maskedDestination: 'j***@example.com' },
    ],
    continuation: { entrypoint: CardEntryPoint.AUTHENTICATION },
  },
};
jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockParams.current,
  navigateWithDetails: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: { code?: string }) =>
    params?.code ? `${key}:${params.code}` : key,
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: () => ({
      addProperties: () => ({ build: () => ({}) }),
    }),
  }),
}));

jest.mock('../../hooks/useRegions', () => ({
  __esModule: true,
  default: () => ({
    allRegions: [
      {
        key: 'NZ',
        name: 'New Zealand',
        emoji: '🇳🇿',
        areaCode: '64',
        canSignUp: true,
      },
    ],
  }),
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

jest.mock('../../components/Onboarding/RegionSelectorModal', () => ({
  setOnValueChange: jest.fn(),
  clearOnValueChange: jest.fn(),
  createRegionSelectorModalNavigationDetails: jest.fn(),
}));

describe('CardMfaMethod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.current = {
      country: 'NZ',
      address: '0xabc',
      options: [
        { method: 'phone', maskedDestination: '+64 *****1234' },
        { method: 'email', maskedDestination: 'j***@example.com' },
      ],
      continuation: { entrypoint: CardEntryPoint.AUTHENTICATION },
    };
  });

  it('submits a phone number in E.164', async () => {
    mockSubmitCredentials.mockResolvedValue({
      done: false,
      nextStep: {
        type: 'mfa_code',
        method: 'phone',
        maskedDestination: '+64 *****1234',
        expiresAt: 1_700_000_000_000,
      },
    });

    const { getByTestId } = render(<CardMfaMethod />);
    fireEvent.press(getByTestId('card-mfa-option-phone'));
    fireEvent.changeText(getByTestId('card-mfa-phone-input'), '211234567');

    await waitFor(() => {
      expect(getByTestId('card-mfa-method-continue')).toBeEnabled();
    });
    fireEvent.press(getByTestId('card-mfa-method-continue'));

    await waitFor(() => {
      expect(mockSubmitCredentials).toHaveBeenCalledWith({
        type: 'mfa_method',
        method: 'phone',
        destination: '+64211234567',
      });
    });
  });

  it('opens the code screen after the phone number is accepted', async () => {
    mockSubmitCredentials.mockResolvedValue({
      done: false,
      nextStep: {
        type: 'mfa_code',
        method: 'phone',
        maskedDestination: '+64 *****1234',
        expiresAt: 1_700_000_000_000,
      },
    });

    const { getByTestId } = render(<CardMfaMethod />);
    fireEvent.press(getByTestId('card-mfa-option-phone'));
    fireEvent.changeText(getByTestId('card-mfa-phone-input'), '211234567');
    fireEvent.press(getByTestId('card-mfa-method-continue'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        'CardMfaCode',
        expect.objectContaining({
          method: 'phone',
          maskedDestination: '+64 *****1234',
          expiresAt: 1_700_000_000_000,
        }),
      );
    });
  });

  it('names the country calling code', () => {
    const { getByTestId } = render(<CardMfaMethod />);

    fireEvent.press(getByTestId('card-mfa-option-phone'));

    expect(getByTestId('card-mfa-country-code')).toHaveProp(
      'accessibilityLabel',
      'card.mfa.country_code_label:64',
    );
  });

  it('lets the user switch from phone to email', () => {
    const { getByTestId, queryByTestId } = render(<CardMfaMethod />);

    fireEvent.press(getByTestId('card-mfa-option-phone'));

    expect(getByTestId('card-mfa-phone-input')).toBeOnTheScreen();
    expect(getByTestId('card-mfa-option-phone')).toHaveProp(
      'accessibilityState',
      {
        selected: true,
      },
    );
    expect(getByTestId('card-mfa-option-email')).toHaveProp(
      'accessibilityState',
      {
        selected: false,
      },
    );

    fireEvent.press(getByTestId('card-mfa-option-email'));

    expect(queryByTestId('card-mfa-phone-input')).toBeNull();
    expect(getByTestId('card-mfa-email-input')).toBeOnTheScreen();
    expect(getByTestId('card-mfa-option-email')).toHaveProp(
      'accessibilityState',
      {
        selected: true,
      },
    );
    expect(getByTestId('card-mfa-option-phone')).toHaveProp(
      'accessibilityState',
      {
        selected: false,
      },
    );
  });

  it('submits a lowercased email', async () => {
    mockSubmitCredentials.mockResolvedValue({
      done: false,
      nextStep: {
        type: 'mfa_code',
        method: 'email',
        maskedDestination: 'j***@example.com',
        expiresAt: null,
      },
    });

    const { getByTestId } = render(<CardMfaMethod />);
    fireEvent.press(getByTestId('card-mfa-option-email'));
    fireEvent.changeText(
      getByTestId('card-mfa-email-input'),
      '  Jane@Example.com ',
    );
    fireEvent.press(getByTestId('card-mfa-method-continue'));

    await waitFor(() => {
      expect(mockSubmitCredentials).toHaveBeenCalledWith({
        type: 'mfa_method',
        method: 'email',
        destination: 'jane@example.com',
      });
    });
  });

  it('keeps the screen when the full contact does not match', async () => {
    mockSubmitCredentials.mockRejectedValue(
      new CardProviderError(
        CardProviderErrorCode.MfaDestinationMismatch,
        'mismatch',
        403,
        'MFA_METHOD_MISMATCH',
      ),
    );

    const { getByTestId, findByTestId } = render(<CardMfaMethod />);
    fireEvent.press(getByTestId('card-mfa-option-email'));
    fireEvent.changeText(
      getByTestId('card-mfa-email-input'),
      'other@example.com',
    );
    fireEvent.press(getByTestId('card-mfa-method-continue'));

    expect(await findByTestId('card-mfa-method-error')).toHaveTextContent(
      'card.mfa.errors.destination_mismatch',
    );
    expect(getByTestId('card-mfa-method-error')).toHaveProp(
      'accessibilityRole',
      'alert',
    );
    expect(getByTestId('card-mfa-method-error')).toHaveProp(
      'accessibilityLiveRegion',
      'polite',
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('keeps start over after another method is chosen', async () => {
    mockSubmitCredentials.mockRejectedValue(
      new CardProviderError(
        CardProviderErrorCode.AuthRestartRequired,
        'restart',
        403,
        'MFA_RESTART_REQUIRED',
      ),
    );

    const { getByTestId, findByTestId, queryByTestId } = render(
      <CardMfaMethod />,
    );
    fireEvent.press(getByTestId('card-mfa-option-email'));
    fireEvent.changeText(
      getByTestId('card-mfa-email-input'),
      'jane@example.com',
    );
    fireEvent.press(getByTestId('card-mfa-method-continue'));

    expect(await findByTestId('card-mfa-method-restart')).toBeOnTheScreen();

    fireEvent.press(getByTestId('card-mfa-option-phone'));

    expect(getByTestId('card-mfa-method-restart')).toBeOnTheScreen();
    expect(queryByTestId('card-mfa-method-continue')).toBeNull();
    expect(getByTestId('card-mfa-method-error')).toHaveTextContent(
      'card.mfa.errors.restart_required',
    );
  });

  it('abandons the login when the user leaves', () => {
    render(<CardMfaMethod />);

    mockListeners.beforeRemove({ data: { action: { type: 'GO_BACK' } } });

    expect(mockAbandonAuth).toHaveBeenCalledTimes(1);
  });

  it('opens the code screen when a restart skips method selection', async () => {
    mockParams.current = { ...mockParams.current, options: [] };
    mockAuthenticateWithWallet.mockResolvedValue({
      done: false,
      nextStep: {
        type: 'mfa_code',
        method: 'email',
        maskedDestination: 'j***@example.com',
        expiresAt: null,
      },
    });

    const { getByTestId } = render(<CardMfaMethod />);
    fireEvent.press(getByTestId('card-mfa-method-restart'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        'CardMfaCode',
        expect.objectContaining({
          method: 'email',
          maskedDestination: 'j***@example.com',
        }),
      );
    });
  });

  it('shows an error and still abandons the login when the next step is unexpected', async () => {
    mockSubmitCredentials.mockResolvedValue({ done: false });

    const { getByTestId, findByTestId } = render(<CardMfaMethod />);
    fireEvent.press(getByTestId('card-mfa-option-email'));
    fireEvent.changeText(
      getByTestId('card-mfa-email-input'),
      'jane@example.com',
    );
    fireEvent.press(getByTestId('card-mfa-method-continue'));

    expect(await findByTestId('card-mfa-method-error')).toHaveTextContent(
      'card.card_authentication.errors.unknown_error',
    );

    mockListeners.beforeRemove({ data: { action: { type: 'NAVIGATE' } } });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockAbandonAuth).toHaveBeenCalledTimes(1);
  });
});
