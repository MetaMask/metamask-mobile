/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, waitFor, act, screen } from '@testing-library/react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import VerifyingRegistration from './VerifyingRegistration';
import Routes from '../../../../../constants/navigation/Routes';
import Logger from '../../../../../util/Logger';
import { CARD_SUPPORT_EMAIL } from '../../constants';

// Mock navigation
const mockNavigationDispatch = jest.fn();
const mockSetOptions = jest.fn();
const mockStackReplace = jest.fn((routeName: string) => ({
  type: 'REPLACE',
  routeName,
}));
const mockStackPop = jest.fn(() => ({
  type: 'POP',
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  StackActions: {
    replace: jest.fn((routeName: string) => ({
      type: 'REPLACE',
      routeName,
    })),
    pop: jest.fn(() => ({
      type: 'POP',
    })),
  },
}));

// Mock SDK
const mockGetUserDetails = jest.fn();
jest.mock('../../sdk', () => ({
  useCardSDK: jest.fn(),
}));

// Mock Logger
jest.mock('../../../../../util/Logger', () => ({
  log: jest.fn(),
}));

// Mock useMetrics
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_VIEWED: 'card_viewed',
    CARD_BUTTON_CLICKED: 'card_button_clicked',
  },
}));

// Mock Redux
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

// Mock constants
jest.mock('../../constants', () => ({
  CARD_SUPPORT_EMAIL: 'metamask@cl-cards.com',
}));

// Mock OnboardingStep component
jest.mock('./OnboardingStep', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
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
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const React = jest.requireActual('react');
  const { View, Text: RNText } = jest.requireActual('react-native');

  const Box = ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement(View, props, children);

  const Text = ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement(RNText, props, children);

  return {
    Box,
    Text,
    TextVariant: {
      BodyMd: 'BodyMd',
    },
    FontWeight: {
      Bold: 'Bold',
    },
  };
});

// Mock ButtonIcon
jest.mock('../../../../../component-library/components/Buttons/ButtonIcon');

// Mock Button
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      label,
      onPress,
      testID,
      ...props
    }: {
      label: string;
      onPress: () => void;
      testID: string;
    }) =>
      React.createElement(
        TouchableOpacity,
        { testID, onPress, ...props },
        React.createElement(Text, {}, label),
      ),
    ButtonSize: {
      Lg: 'Lg',
    },
    ButtonVariants: {
      Primary: 'Primary',
    },
    ButtonWidthTypes: {
      Full: 'Full',
    },
  };
});

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, options?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'card.card_onboarding.verifying_registration.title':
        'Verifying your identity',
      'card.card_onboarding.verifying_registration.description':
        'Crypto Life is attempting to verify you. This will take at most 30 seconds.',
      'card.card_onboarding.verifying_registration.verified_title': 'Approved!',
      'card.card_onboarding.verifying_registration.verified_description':
        'Your KYC was approved. You can now use MetaMask Card.',
      'card.card_onboarding.verifying_registration.continue_button': 'Continue',
      'card.card_onboarding.verifying_registration.timeout_title':
        'Verification in progress',
      'card.card_onboarding.verifying_registration.timeout_description':
        'Your verification will take up to 12 hours. Please come back to the Card section in that time.',
      'card.card_onboarding.verifying_registration.rejected_title':
        'Verification incomplete',
      'card.card_onboarding.verifying_registration.rejected_description':
        'We need a bit more information to complete your verification.',
      'card.card_onboarding.verifying_registration.rejected_message': `Please reach out to our support team and we'll help you complete the process. ${options?.email || ''}`,
      'card.card_onboarding.verifying_registration.server_error_title_main':
        'Something went wrong',
      'card.card_onboarding.verifying_registration.server_error_title':
        "We're experiencing server issues",
      'card.card_onboarding.verifying_registration.server_error_message': `We're unable to complete your verification at the moment. Please try again later or contact support at ${options?.email || ''} for assistance.`,
    };
    return translations[key] || key;
  }),
}));

// Mock header style
jest.mock('../../routes', () => ({
  headerStyle: {
    icon: {},
  },
}));

// Helper function to create mock user data
const createMockUserResponse = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  verificationState: 'PENDING',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1990-01-01',
  phoneNumber: '1234567890',
  phoneCountryCode: '+1',
  addressLine1: '123 Main St',
  addressLine2: null,
  city: 'New York',
  zip: '10001',
  usState: null,
  ssn: null,
  countryOfResidence: 'US',
  countryOfNationality: 'US',
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('VerifyingRegistration Component', () => {
  const { useMetrics } = jest.requireMock('../../../../hooks/useMetrics');
  const { useCardSDK } = jest.requireMock('../../sdk');
  const { useDispatch } = jest.requireMock('react-redux');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (useNavigation as jest.Mock).mockReturnValue({
      dispatch: mockNavigationDispatch,
      setOptions: mockSetOptions,
    });

    (StackActions.replace as jest.Mock).mockImplementation(mockStackReplace);
    (StackActions.pop as jest.Mock).mockImplementation(mockStackPop);

    mockCreateEventBuilder.mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    });

    useMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });

    useCardSDK.mockReturnValue({
      sdk: {
        getUserDetails: mockGetUserDetails,
      },
      setUser: jest.fn(),
    });

    useDispatch.mockReturnValue(mockDispatch);

    mockGetUserDetails.mockResolvedValue(createMockUserResponse());
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders the VerifyingRegistration component', () => {
      render(<VerifyingRegistration />);

      expect(screen.getByTestId('onboarding-step')).toBeTruthy();
    });

    it('renders polling state title', () => {
      render(<VerifyingRegistration />);

      const title = screen.getByTestId('onboarding-step-title');

      expect(title.props.children).toBe('Verifying your identity');
    });

    it('renders polling state description', () => {
      render(<VerifyingRegistration />);

      const description = screen.getByTestId('onboarding-step-description');

      expect(description.props.children).toBe(
        'Crypto Life is attempting to verify you. This will take at most 30 seconds.',
      );
    });

    it('renders form fields during polling', () => {
      render(<VerifyingRegistration />);

      const formFields = screen.getByTestId('onboarding-step-form-fields');

      expect(formFields).toBeTruthy();
    });
  });

  describe('Polling Behavior', () => {
    it('starts polling immediately on mount', async () => {
      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
      });
    });

    it('polls getUserDetails every 3 seconds', async () => {
      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockGetUserDetails).toHaveBeenCalledTimes(2);
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockGetUserDetails).toHaveBeenCalledTimes(3);
      });
    });

    it('stops polling after 30 seconds timeout', async () => {
      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(mockGetUserDetails).toHaveBeenCalled();
      });

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        const title = screen.getByTestId('onboarding-step-title');
        expect(title.props.children).toBe('Verification in progress');
      });
    });

    it('cleans up polling on unmount', async () => {
      const { unmount } = render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
      });

      unmount();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // No additional calls after unmount
      expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('VERIFIED State', () => {
    it('stops polling when verification is complete', async () => {
      mockGetUserDetails.mockResolvedValueOnce(
        createMockUserResponse({ verificationState: 'VERIFIED' }),
      );

      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
    });

    it('displays verified title when verification completes', async () => {
      mockGetUserDetails.mockResolvedValueOnce(
        createMockUserResponse({ verificationState: 'VERIFIED' }),
      );

      render(<VerifyingRegistration />);

      await waitFor(() => {
        const title = screen.getByTestId('onboarding-step-title');
        expect(title.props.children).toBe('Approved!');
      });
    });

    it('displays verified description when verification completes', async () => {
      mockGetUserDetails.mockResolvedValueOnce(
        createMockUserResponse({ verificationState: 'VERIFIED' }),
      );

      render(<VerifyingRegistration />);

      await waitFor(() => {
        const description = screen.getByTestId('onboarding-step-description');
        expect(description.props.children).toBe(
          'Your KYC was approved. You can now use MetaMask Card.',
        );
      });
    });

    it('displays continue button when verified', async () => {
      mockGetUserDetails.mockResolvedValueOnce(
        createMockUserResponse({ verificationState: 'VERIFIED' }),
      );

      render(<VerifyingRegistration />);

      await waitFor(() => {
        const button = screen.getByTestId(
          'verifying-registration-continue-button',
        );
        expect(button).toBeTruthy();
      });
    });

    it('resets onboarding state on mount', async () => {
      mockGetUserDetails.mockResolvedValueOnce(
        createMockUserResponse({ verificationState: 'VERIFIED' }),
      );

      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it('navigates to COMPLETE when continue button is pressed', async () => {
      mockGetUserDetails.mockResolvedValueOnce(
        createMockUserResponse({ verificationState: 'VERIFIED' }),
      );

      render(<VerifyingRegistration />);

      const button = await screen.findByTestId(
        'verifying-registration-continue-button',
      );

      await act(async () => {
        await button.props.onPress();
      });

      await waitFor(() => {
        expect(mockStackReplace).toHaveBeenCalledWith(
          Routes.CARD.ONBOARDING.ROOT,
          {
            screen: Routes.CARD.ONBOARDING.COMPLETE,
          },
        );
      });
    });

    it('dispatches replace action when continue button is pressed', async () => {
      mockGetUserDetails.mockResolvedValueOnce(
        createMockUserResponse({ verificationState: 'VERIFIED' }),
      );

      render(<VerifyingRegistration />);

      const button = await screen.findByTestId(
        'verifying-registration-continue-button',
      );

      await act(async () => {
        await button.props.onPress();
      });

      await waitFor(() => {
        expect(mockNavigationDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            routeName: Routes.CARD.ONBOARDING.ROOT,
            type: 'REPLACE',
          }),
        );
      });
    });
  });

  describe('REJECTED State', () => {
    it('navigates to KYC_FAILED when verification is rejected', async () => {
      mockGetUserDetails.mockResolvedValueOnce(
        createMockUserResponse({ verificationState: 'REJECTED' }),
      );

      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(mockStackReplace).toHaveBeenCalledWith(
          Routes.CARD.ONBOARDING.ROOT,
          {
            screen: Routes.CARD.ONBOARDING.KYC_FAILED,
          },
        );
      });
    });

    it('dispatches replace action when rejected', async () => {
      mockGetUserDetails.mockResolvedValueOnce(
        createMockUserResponse({ verificationState: 'REJECTED' }),
      );

      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(mockNavigationDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            routeName: Routes.CARD.ONBOARDING.ROOT,
            type: 'REPLACE',
          }),
        );
      });
    });

    it('stops polling when verification is rejected', async () => {
      mockGetUserDetails.mockResolvedValueOnce(
        createMockUserResponse({ verificationState: 'REJECTED' }),
      );

      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timeout State', () => {
    it('displays timeout title after 30 seconds', async () => {
      render(<VerifyingRegistration />);

      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        const title = screen.getByTestId('onboarding-step-title');

        expect(title.props.children).toBe('Verification in progress');
      });
    });

    it('displays timeout description after 30 seconds', async () => {
      render(<VerifyingRegistration />);

      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        const description = screen.getByTestId('onboarding-step-description');

        expect(description.props.children).toBe(
          'Your verification will take up to 12 hours. Please come back to the Card section in that time.',
        );
      });
    });

    it('stops polling after timeout', async () => {
      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(mockGetUserDetails).toHaveBeenCalled();
      });

      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      const callCountAfterTimeout = mockGetUserDetails.mock.calls.length;

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockGetUserDetails).toHaveBeenCalledTimes(callCountAfterTimeout);
    });
  });

  describe('Error State', () => {
    it('displays error title when API fails', async () => {
      mockGetUserDetails.mockRejectedValueOnce(new Error('Network error'));

      render(<VerifyingRegistration />);

      await waitFor(() => {
        const title = screen.getByTestId('onboarding-step-title');

        expect(title.props.children).toBe('Something went wrong');
      });
    });

    it('displays server error message when API fails', async () => {
      mockGetUserDetails.mockRejectedValueOnce(new Error('Network error'));
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(strings).toHaveBeenCalledWith(
          'card.card_onboarding.verifying_registration.server_error_message',
          { email: CARD_SUPPORT_EMAIL },
        );
      });
    });

    it('logs error when getUserDetails fails', async () => {
      const error = new Error('Network error');
      mockGetUserDetails.mockRejectedValueOnce(error);

      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(Logger.log).toHaveBeenCalledWith(
          'VerifyingRegistration: Error fetching user details',
          error,
        );
      });
    });

    it('stops polling when API fails', async () => {
      mockGetUserDetails.mockRejectedValueOnce(new Error('Network error'));

      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('Navigation Integration', () => {
    it('calls setOptions to configure header', async () => {
      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });
    });

    it('updates header when step changes to rejected', async () => {
      mockGetUserDetails.mockResolvedValueOnce({
        verificationState: 'REJECTED',
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        phoneNumber: '1234567890',
        phoneCountryCode: '+1',
        addressLine1: '123 Main St',
        addressLine2: null,
        city: 'New York',
        zip: '10001',
        usState: null,
        ssn: null,
        countryOfResidence: 'US',
        countryOfNationality: 'US',
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });
    });
  });

  describe('Metrics Tracking', () => {
    it('tracks screen view on mount', async () => {
      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalled();
        expect(mockCreateEventBuilder).toHaveBeenCalled();
      });
    });
  });

  describe('State Reset', () => {
    it('resets onboarding state immediately on mount', () => {
      render(<VerifyingRegistration />);

      expect(mockDispatch).toHaveBeenCalled();
    });

    it('dispatches resetOnboardingState action on mount', () => {
      render(<VerifyingRegistration />);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('i18n Integration', () => {
    it('uses correct translation key for polling title', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingRegistration />);

      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.verifying_registration.title',
      );
    });

    it('uses correct translation key for polling description', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingRegistration />);

      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.verifying_registration.description',
      );
    });

    it('uses correct translation key for verified title', async () => {
      mockGetUserDetails.mockResolvedValueOnce(
        createMockUserResponse({ verificationState: 'VERIFIED' }),
      );
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(strings).toHaveBeenCalledWith(
          'card.card_onboarding.verifying_registration.verified_title',
        );
      });
    });

    it('uses correct translation key for verified description', async () => {
      mockGetUserDetails.mockResolvedValueOnce(
        createMockUserResponse({ verificationState: 'VERIFIED' }),
      );
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(strings).toHaveBeenCalledWith(
          'card.card_onboarding.verifying_registration.verified_description',
        );
      });
    });

    it('uses correct translation key for continue button', async () => {
      mockGetUserDetails.mockResolvedValueOnce(
        createMockUserResponse({ verificationState: 'VERIFIED' }),
      );
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(strings).toHaveBeenCalledWith(
          'card.card_onboarding.verifying_registration.continue_button',
        );
      });
    });

    it('uses correct translation key for timeout title', async () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingRegistration />);

      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(strings).toHaveBeenCalledWith(
          'card.card_onboarding.verifying_registration.timeout_title',
        );
      });
    });

    it('uses correct translation key for timeout description with email', async () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingRegistration />);

      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(strings).toHaveBeenCalledWith(
          'card.card_onboarding.verifying_registration.timeout_description',
          { email: CARD_SUPPORT_EMAIL },
        );
      });
    });

    it('uses correct translation key for error title', async () => {
      mockGetUserDetails.mockRejectedValueOnce(new Error('Network error'));
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(strings).toHaveBeenCalledWith(
          'card.card_onboarding.verifying_registration.server_error_title_main',
        );
      });
    });

    it('uses correct translation key for server error title', async () => {
      mockGetUserDetails.mockRejectedValueOnce(new Error('Network error'));
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(strings).toHaveBeenCalledWith(
          'card.card_onboarding.verifying_registration.server_error_title',
        );
      });
    });

    it('uses correct translation key for server error message with email', async () => {
      mockGetUserDetails.mockRejectedValueOnce(new Error('Network error'));
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingRegistration />);

      await waitFor(() => {
        expect(strings).toHaveBeenCalledWith(
          'card.card_onboarding.verifying_registration.server_error_message',
          { email: CARD_SUPPORT_EMAIL },
        );
      });
    });
  });
});
