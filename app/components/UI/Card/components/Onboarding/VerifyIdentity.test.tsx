import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useNavigation } from '@react-navigation/native';
import VerifyIdentity from './VerifyIdentity';
import Routes from '../../../../../constants/navigation/Routes';
import useStartVerification from '../../hooks/useStartVerification';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock useStartVerification hook
jest.mock('../../hooks/useStartVerification');

// Mock useMetrics hook
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({ event: 'test' }),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    CARD_BUTTON_CLICKED: 'CARD_BUTTON_CLICKED',
    CARD_VIEWED: 'CARD_VIEWED',
  },
}));

// Mock metrics util
jest.mock('../../util/metrics', () => ({
  CardActions: {
    VERIFY_IDENTITY_BUTTON: 'VERIFY_IDENTITY_BUTTON',
  },
  CardScreens: {
    VERIFY_IDENTITY: 'VERIFY_IDENTITY',
  },
}));

// Mock useTailwind hook
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

// Mock OnboardingStep component
jest.mock('./OnboardingStep', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return ({
    title,
    description,
    formFields,
    actions,
  }: {
    title: string;
    description: string;
    formFields: React.ReactNode;
    actions: React.ReactNode;
  }) =>
    React.createElement(
      View,
      { testID: 'onboarding-step' },
      React.createElement(Text, { testID: 'onboarding-step-title' }, title),
      React.createElement(
        Text,
        { testID: 'onboarding-step-description' },
        description,
      ),
      React.createElement(
        View,
        { testID: 'onboarding-step-form-fields' },
        formFields,
      ),
      React.createElement(View, { testID: 'onboarding-step-actions' }, actions),
    );
});

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(View, props, children),
    Text: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(Text, props, children),
    Icon: ({ name, ...props }: { name: string } & Record<string, unknown>) =>
      React.createElement(View, { ...props, testID: `icon-${name}` }),
    TextVariant: {
      BodySm: 'BodySm',
      BodyMd: 'BodyMd',
    },
    IconName: {
      EyeSlash: 'EyeSlash',
      Verified: 'Verified',
    },
    IconSize: {
      Lg: 'Lg',
    },
    IconColor: {
      IconAlternative: 'IconAlternative',
    },
  };
});

// Mock Button component
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  const MockButton = ({
    label,
    onPress,
    isDisabled,
    testID,
    ...props
  }: {
    label: string;
    onPress: () => void;
    isDisabled?: boolean;
    testID?: string;
    variant?: string;
    size?: string;
    width?: string;
  }) =>
    React.createElement(
      TouchableOpacity,
      {
        testID: testID || 'verify-identity-continue-button',
        onPress,
        disabled: isDisabled,
        ...props,
      },
      React.createElement(
        Text,
        { testID: 'verify-identity-continue-button-text' },
        label,
      ),
    );

  // Mock the enums
  MockButton.ButtonSize = {
    Sm: '32',
    Md: '40',
    Lg: '48',
    Auto: 'auto',
  };

  MockButton.ButtonVariants = {
    Link: 'Link',
    Primary: 'Primary',
    Secondary: 'Secondary',
  };

  MockButton.ButtonWidthTypes = {
    Auto: 'auto',
    Full: 'full',
  };

  return {
    __esModule: true,
    default: MockButton,
    ButtonSize: MockButton.ButtonSize,
    ButtonVariants: MockButton.ButtonVariants,
    ButtonWidthTypes: MockButton.ButtonWidthTypes,
  };
});

// Mock i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: { [key: string]: string } = {
      'card.card_onboarding.verify_identity.title': 'Verify your identity',
      'card.card_onboarding.verify_identity.description':
        'We need to verify your identity to continue with your card application.',
      'card.card_onboarding.continue_button': 'Continue',
      'card.card_onboarding.verify_identity.start_verification_error':
        'Unable to start verification. Please try again.',
      'card.card_onboarding.verify_identity.terms_1':
        'Your identity data is encrypted and stored securely.',
      'card.card_onboarding.verify_identity.terms_2':
        'We verify your identity with a trusted partner.',
    };
    return mockStrings[key] || key;
  }),
}));

// Create test store
const createTestStore = (initialState = {}) =>
  configureStore({
    reducer: {
      card: (
        state = {
          onboarding: {
            selectedCountry: null,
            onboardingId: null,
            contactVerificationId: null,
            user: null,
            ...initialState,
          },
          userCardLocation: 'international',
        },
        action = { type: '', payload: null },
      ) => {
        switch (action.type) {
          default:
            return state;
        }
      },
    },
  });

describe('VerifyIdentity Component', () => {
  const mockNavigate = jest.fn();
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackEvent.mockClear();
    mockCreateEventBuilder.mockClear();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });

    (useStartVerification as jest.Mock).mockReturnValue({
      data: { sessionUrl: 'https://example.com/verify' },
      isLoading: false,
      isError: false,
      error: null,
    });

    store = createTestStore();
  });

  describe('Initial Render', () => {
    it('renders all elements with correct testIDs', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      expect(getByTestId('onboarding-step')).toBeTruthy();
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
      expect(getByTestId('verify-identity-continue-button')).toBeTruthy();
    });

    it('has continue button enabled when sessionUrl is available', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      const continueButton = getByTestId('verify-identity-continue-button');
      expect(continueButton.props.disabled).toBe(false);
    });

    it('does not show error messages initially when verification is successful', () => {
      const { queryByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      expect(
        queryByTestId('verify-identity-start-verification-error'),
      ).toBeNull();
    });

    it('displays the correct title and description', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');

      expect(title.props.children).toBe('Verify your identity');
      expect(description.props.children).toBe(
        'We need to verify your identity to continue with your card application.',
      );
    });
  });

  describe('Error State Testing', () => {
    it('shows error message when verification hook fails', () => {
      (useStartVerification as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: 'Verification service unavailable',
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      const errorText = getByTestId('verify-identity-start-verification-error');
      expect(errorText).toBeTruthy();
      expect(errorText.props.children).toBe('Verification service unavailable');
    });

    it('shows default error message when no sessionUrl and not loading', () => {
      (useStartVerification as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      const errorText = getByTestId('verify-identity-start-verification-error');
      expect(errorText).toBeTruthy();
      expect(errorText.props.children).toBe(
        'Unable to start verification. Please try again.',
      );
    });

    it('disables continue button when no sessionUrl is available', () => {
      (useStartVerification as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      const continueButton = getByTestId('verify-identity-continue-button');
      expect(continueButton.props.disabled).toBe(true);
    });
  });

  describe('Loading State Testing', () => {
    it('does not show error when verification is loading', () => {
      (useStartVerification as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
      });

      const { queryByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      expect(
        queryByTestId('verify-identity-start-verification-error'),
      ).toBeNull();
    });

    it('disables continue button when verification is loading', () => {
      (useStartVerification as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      const continueButton = getByTestId('verify-identity-continue-button');
      expect(continueButton.props.disabled).toBe(true);
    });
  });

  describe('Button Interaction and Navigation', () => {
    it('navigates to WebView when continue button is pressed', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      const button = getByTestId('verify-identity-continue-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CARD.ONBOARDING.WEBVIEW,
          {
            url: 'https://example.com/verify',
          },
        );
      });
    });

    it('does not navigate when continue button is pressed without sessionUrl', async () => {
      (useStartVerification as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      const button = getByTestId('verify-identity-continue-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it('handles multiple button presses', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      const button = getByTestId('verify-identity-continue-button');

      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(3);
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CARD.ONBOARDING.WEBVIEW,
          {
            url: 'https://example.com/verify',
          },
        );
      });
    });
  });

  describe('Form Fields', () => {
    it('renders empty form fields section when no errors', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      const formFields = getByTestId('onboarding-step-form-fields');
      expect(formFields).toBeTruthy();
    });

    it('renders error in form fields when verification fails', () => {
      (useStartVerification as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: 'Network error',
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      const errorText = getByTestId('verify-identity-start-verification-error');
      expect(errorText).toBeTruthy();
    });
  });

  describe('Navigation Integration', () => {
    it('uses navigation hook correctly', () => {
      render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      expect(useNavigation).toHaveBeenCalled();
    });
  });

  describe('Component Integration', () => {
    it('passes correct props to OnboardingStep', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      const onboardingStep = getByTestId('onboarding-step');
      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');
      const formFields = getByTestId('onboarding-step-form-fields');
      const actions = getByTestId('onboarding-step-actions');

      expect(onboardingStep).toBeTruthy();
      expect(title.props.children).toBe('Verify your identity');
      expect(description.props.children).toBe(
        'We need to verify your identity to continue with your card application.',
      );
      expect(formFields).toBeTruthy();
      expect(actions).toBeTruthy();
    });

    it('renders actions section with continue button', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      const actions = getByTestId('onboarding-step-actions');
      const button = getByTestId('verify-identity-continue-button');

      expect(actions).toBeTruthy();
      expect(button).toBeTruthy();
    });
  });

  describe('i18n Integration', () => {
    it('uses correct i18n keys for title and description', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.verify_identity.title',
      );
      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.verify_identity.description',
      );
      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.continue_button',
      );
    });

    it('uses correct i18n key for error message', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      (useStartVerification as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.verify_identity.start_verification_error',
      );
    });

    it('uses correct i18n keys for terms text', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.verify_identity.terms_1',
      );
      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.verify_identity.terms_2',
      );
    });
  });

  describe('Metrics Tracking', () => {
    it('tracks CARD_VIEWED event on component mount', () => {
      render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      expect(mockCreateEventBuilder).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks CARD_BUTTON_CLICKED event when continue button is pressed', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <VerifyIdentity />
        </Provider>,
      );

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();

      const button = getByTestId('verify-identity-continue-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalled();
        expect(mockTrackEvent).toHaveBeenCalled();
      });
    });
  });
});
