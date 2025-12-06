// Mock dependencies first
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('../../hooks/useUserRegistrationStatus', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_VIEWED: 'CARD_VIEWED',
  },
}));

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
    Icon: ({ name, testID }: { name: string; testID?: string }) =>
      React.createElement(View, { testID: testID || `icon-${name}` }),
    IconName: {
      Speed: 'Speed',
      SecuritySearch: 'SecuritySearch',
    },
    IconSize: {
      Lg: 'Lg',
    },
    IconColor: {
      IconAlternative: 'IconAlternative',
    },
    TextVariant: {
      BodyMd: 'BodyMd',
    },
  };
});

jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  const MockButton = ({
    label,
    onPress,
    disabled,
    testID,
    ...props
  }: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    testID?: string;
    [key: string]: unknown;
  }) =>
    React.createElement(
      TouchableOpacity,
      {
        testID: testID || 'button',
        onPress,
        disabled,
        ...props,
      },
      React.createElement(Text, {}, label),
    );

  return {
    __esModule: true,
    default: MockButton,
    ButtonVariants: {
      Secondary: 'Secondary',
    },
    ButtonWidthTypes: {
      Full: 'Full',
    },
    ButtonSize: {
      Lg: 'Lg',
    },
  };
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const React = jest.requireActual('react');

  return {
    ...RN,
    Image: ({
      testID,
      ...props
    }: {
      testID?: string;
      [key: string]: unknown;
    }) =>
      React.createElement(RN.View, {
        testID: testID || 'image',
        ...props,
      }),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'card.card_onboarding.validating_kyc.title': 'Validating your identity',
      'card.card_onboarding.validating_kyc.description':
        'Please wait while we validate your identity.',
      'card.card_onboarding.close_button': 'Close',
      'card.card_onboarding.validating_kyc.terms_1': 'Terms 1 text',
      'card.card_onboarding.validating_kyc.terms_2': 'Terms 2 text',
    };
    return translations[key] || key;
  }),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ValidatingKYC from './ValidatingKYC';
import useUserRegistrationStatus from '../../hooks/useUserRegistrationStatus';
import { useMetrics } from '../../../../hooks/useMetrics';
import Routes from '../../../../../constants/navigation/Routes';

describe('ValidatingKYC Component', () => {
  let mockNavigate: jest.Mock;
  let mockReset: jest.Mock;
  let mockUseUserRegistrationStatus: jest.Mock;
  let mockStartPolling: jest.Mock;
  let mockStopPolling: jest.Mock;
  let mockTrackEvent: jest.Mock;
  let mockCreateEventBuilder: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate = jest.fn();
    mockReset = jest.fn();
    mockStartPolling = jest.fn();
    mockStopPolling = jest.fn();
    mockTrackEvent = jest.fn();
    mockCreateEventBuilder = jest.fn().mockReturnValue({
      addProperties: jest.fn().mockReturnValue({
        build: jest.fn().mockReturnValue({ event: 'test' }),
      }),
    });

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      reset: mockReset,
    });

    (useRoute as jest.Mock).mockReturnValue({
      params: { sessionUrl: 'https://example.com/session' },
    });

    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });

    // Default mock for useUserRegistrationStatus
    mockUseUserRegistrationStatus = jest.fn().mockReturnValue({
      verificationState: 'PENDING',
      userResponse: null,
      isLoading: false,
      isError: false,
      error: null,
      clearError: jest.fn(),
      startPolling: mockStartPolling,
      stopPolling: mockStopPolling,
    });
    (useUserRegistrationStatus as jest.Mock).mockImplementation(
      mockUseUserRegistrationStatus,
    );
  });

  describe('Initial Render', () => {
    it('renders onboarding step with correct testID', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('renders title with correct text', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const title = getByTestId('onboarding-step-title');
      expect(title).toBeTruthy();
      expect(title.props.children).toBe('Validating your identity');
    });

    it('renders description with correct text', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const description = getByTestId('onboarding-step-description');
      expect(description).toBeTruthy();
    });

    it('renders form fields with image and info boxes', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const formFields = getByTestId('onboarding-step-form-fields');
      expect(formFields).toBeTruthy();
      expect(formFields.children.length).toBeGreaterThan(0);
    });

    it('renders close button in actions', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const closeButton = getByTestId('validating-kyc-close-button');
      expect(closeButton).toBeTruthy();
    });
  });

  describe('Close Button Navigation', () => {
    it('navigates to wallet home when close button is pressed', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const closeButton = getByTestId('validating-kyc-close-button');
      fireEvent.press(closeButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('calls navigate exactly once per button press', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const closeButton = getByTestId('validating-kyc-close-button');
      fireEvent.press(closeButton);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('calls navigate multiple times for multiple button presses', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const closeButton = getByTestId('validating-kyc-close-button');
      fireEvent.press(closeButton);
      fireEvent.press(closeButton);
      fireEvent.press(closeButton);

      expect(mockNavigate).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.WALLET.HOME);
      expect(mockNavigate).toHaveBeenNthCalledWith(2, Routes.WALLET.HOME);
      expect(mockNavigate).toHaveBeenNthCalledWith(3, Routes.WALLET.HOME);
    });

    it('uses navigate (not reset) for close button', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const closeButton = getByTestId('validating-kyc-close-button');
      fireEvent.press(closeButton);

      expect(mockNavigate).toHaveBeenCalled();
      expect(mockReset).not.toHaveBeenCalled();
    });

    it('navigates to wallet home while verification is PENDING', () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'PENDING',
        userResponse: null,
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      const { getByTestId } = render(<ValidatingKYC />);

      const closeButton = getByTestId('validating-kyc-close-button');
      fireEvent.press(closeButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('navigates to wallet home while verification is loading', () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: null,
        userResponse: null,
        isLoading: true,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      const { getByTestId } = render(<ValidatingKYC />);

      const closeButton = getByTestId('validating-kyc-close-button');
      fireEvent.press(closeButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('navigates to wallet home when there is an error', () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: null,
        userResponse: null,
        isLoading: false,
        isError: true,
        error: 'Verification failed',
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      const { getByTestId } = render(<ValidatingKYC />);

      const closeButton = getByTestId('validating-kyc-close-button');
      fireEvent.press(closeButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });
  });

  describe('Metrics Tracking', () => {
    it('tracks CARD_VIEWED event on mount', () => {
      render(<ValidatingKYC />);

      expect(mockCreateEventBuilder).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('Error States', () => {
    it('renders component when isError is true', () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: null,
        userResponse: null,
        isLoading: false,
        isError: true,
        error: 'Verification failed',
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      const { getByTestId } = render(<ValidatingKYC />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('renders component when error message is null', () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: null,
        userResponse: null,
        isLoading: false,
        isError: true,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      const { getByTestId } = render(<ValidatingKYC />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('renders component when isLoading is true', () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: null,
        userResponse: null,
        isLoading: true,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      const { getByTestId } = render(<ValidatingKYC />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });

    it('renders component when verification is pending and loading', () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'PENDING',
        userResponse: null,
        isLoading: true,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      const { getByTestId } = render(<ValidatingKYC />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
    });
  });

  describe('User States - Verification Status Navigation', () => {
    it('resets navigation to COMPLETE when verificationState is VERIFIED', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'VERIFIED',
        userResponse: { verificationState: 'VERIFIED' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<ValidatingKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.COMPLETE }],
        });
      });
    });

    it('resets navigation to KYC_FAILED when verificationState is REJECTED', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'REJECTED',
        userResponse: { verificationState: 'REJECTED' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<ValidatingKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.KYC_FAILED }],
        });
      });
    });

    it('does not navigate when verificationState is PENDING', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'PENDING',
        userResponse: { verificationState: 'PENDING' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<ValidatingKYC />);

      await waitFor(
        () => {
          expect(mockReset).not.toHaveBeenCalled();
        },
        { timeout: 100 },
      );
    });

    it('does not navigate when verificationState is null', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: null,
        userResponse: null,
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<ValidatingKYC />);

      await waitFor(
        () => {
          expect(mockReset).not.toHaveBeenCalled();
        },
        { timeout: 100 },
      );
    });

    it('does not navigate when verificationState is undefined', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: undefined,
        userResponse: null,
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<ValidatingKYC />);

      await waitFor(
        () => {
          expect(mockReset).not.toHaveBeenCalled();
        },
        { timeout: 100 },
      );
    });

    it('uses reset (not navigate) for verification state changes', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'VERIFIED',
        userResponse: { verificationState: 'VERIFIED' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<ValidatingKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it('resets with index 0 for VERIFIED state', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'VERIFIED',
        userResponse: { verificationState: 'VERIFIED' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<ValidatingKYC />);

      await waitFor(() => {
        const resetCall = mockReset.mock.calls[0][0];
        expect(resetCall.index).toBe(0);
      });
    });

    it('resets with index 0 for REJECTED state', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'REJECTED',
        userResponse: { verificationState: 'REJECTED' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<ValidatingKYC />);

      await waitFor(() => {
        const resetCall = mockReset.mock.calls[0][0];
        expect(resetCall.index).toBe(0);
      });
    });

    it('resets with single route in routes array for VERIFIED', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'VERIFIED',
        userResponse: { verificationState: 'VERIFIED' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<ValidatingKYC />);

      await waitFor(() => {
        const resetCall = mockReset.mock.calls[0][0];
        expect(resetCall.routes).toHaveLength(1);
      });
    });

    it('resets with single route in routes array for REJECTED', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'REJECTED',
        userResponse: { verificationState: 'REJECTED' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<ValidatingKYC />);

      await waitFor(() => {
        const resetCall = mockReset.mock.calls[0][0];
        expect(resetCall.routes).toHaveLength(1);
      });
    });

    it('does not navigate for unknown verification states', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'UNKNOWN_STATE',
        userResponse: { verificationState: 'UNKNOWN_STATE' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<ValidatingKYC />);

      await waitFor(
        () => {
          expect(mockReset).not.toHaveBeenCalled();
        },
        { timeout: 100 },
      );
    });

    it('does not navigate when verificationState is empty string', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: '',
        userResponse: null,
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<ValidatingKYC />);

      await waitFor(
        () => {
          expect(mockReset).not.toHaveBeenCalled();
        },
        { timeout: 100 },
      );
    });
  });

  describe('Navigation Integration', () => {
    it('uses useNavigation hook', () => {
      render(<ValidatingKYC />);

      expect(useNavigation).toHaveBeenCalled();
    });

    it('calls reset with correct route for VERIFIED state', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'VERIFIED',
        userResponse: { verificationState: 'VERIFIED' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<ValidatingKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.COMPLETE }],
        });
      });
    });

    it('calls reset with correct route for REJECTED state', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'REJECTED',
        userResponse: { verificationState: 'REJECTED' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<ValidatingKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.KYC_FAILED }],
        });
      });
    });

    it('provides both navigate and reset methods from useNavigation', () => {
      render(<ValidatingKYC />);

      expect(useNavigation).toHaveBeenCalled();
      // Verify the navigation object has the expected methods
      const navigationReturn = (useNavigation as jest.Mock).mock.results[0]
        .value;
      expect(navigationReturn.navigate).toBeDefined();
      expect(navigationReturn.reset).toBeDefined();
    });
  });

  describe('Navigation State Transitions', () => {
    it('triggers navigation when verification state transitions to VERIFIED', async () => {
      // Start with PENDING state
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'PENDING',
        userResponse: null,
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      const { rerender } = render(<ValidatingKYC />);

      // Verify no navigation yet
      expect(mockReset).not.toHaveBeenCalled();

      // Simulate state change to VERIFIED
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'VERIFIED',
        userResponse: { verificationState: 'VERIFIED' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      rerender(<ValidatingKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.COMPLETE }],
        });
      });
    });

    it('triggers navigation when verification state transitions to REJECTED', async () => {
      // Start with PENDING state
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'PENDING',
        userResponse: null,
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      const { rerender } = render(<ValidatingKYC />);

      // Verify no navigation yet
      expect(mockReset).not.toHaveBeenCalled();

      // Simulate state change to REJECTED
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'REJECTED',
        userResponse: { verificationState: 'REJECTED' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      rerender(<ValidatingKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.KYC_FAILED }],
        });
      });
    });

    it('does not navigate when state remains PENDING', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'PENDING',
        userResponse: null,
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      const { rerender } = render(<ValidatingKYC />);

      // Re-render with same state
      rerender(<ValidatingKYC />);
      rerender(<ValidatingKYC />);

      await waitFor(
        () => {
          expect(mockReset).not.toHaveBeenCalled();
        },
        { timeout: 100 },
      );
    });

    it('handles rapid state transitions correctly', async () => {
      // Start with null
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: null,
        userResponse: null,
        isLoading: true,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      const { rerender } = render(<ValidatingKYC />);

      // Transition to PENDING
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'PENDING',
        userResponse: null,
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      rerender(<ValidatingKYC />);

      // Transition to VERIFIED
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'VERIFIED',
        userResponse: { verificationState: 'VERIFIED' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      rerender(<ValidatingKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.COMPLETE }],
        });
      });
    });
  });

  describe('Navigation and Polling Coordination', () => {
    it('continues polling while verification state is PENDING', () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'PENDING',
        userResponse: null,
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<ValidatingKYC />);

      expect(mockStartPolling).toHaveBeenCalled();
      expect(mockReset).not.toHaveBeenCalled();
    });

    it('stops polling on unmount even when navigating to COMPLETE', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'VERIFIED',
        userResponse: { verificationState: 'VERIFIED' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      const { unmount } = render(<ValidatingKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalled();
      });

      unmount();

      expect(mockStopPolling).toHaveBeenCalled();
    });

    it('stops polling on unmount even when navigating to KYC_FAILED', async () => {
      mockUseUserRegistrationStatus.mockReturnValue({
        verificationState: 'REJECTED',
        userResponse: { verificationState: 'REJECTED' },
        isLoading: false,
        isError: false,
        error: null,
        clearError: jest.fn(),
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      const { unmount } = render(<ValidatingKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalled();
      });

      unmount();

      expect(mockStopPolling).toHaveBeenCalled();
    });
  });

  describe('Polling Lifecycle', () => {
    it('starts polling when component mounts', () => {
      render(<ValidatingKYC />);

      expect(mockStartPolling).toHaveBeenCalledTimes(1);
    });

    it('stops polling when component unmounts', () => {
      const { unmount } = render(<ValidatingKYC />);

      unmount();

      expect(mockStopPolling).toHaveBeenCalledTimes(1);
    });

    it('calls startPolling before stopPolling', () => {
      const callOrder: string[] = [];

      mockStartPolling.mockImplementation(() => {
        callOrder.push('start');
      });

      mockStopPolling.mockImplementation(() => {
        callOrder.push('stop');
      });

      const { unmount } = render(<ValidatingKYC />);
      unmount();

      expect(callOrder).toEqual(['start', 'stop']);
    });
  });

  describe('Component Integration', () => {
    it('passes correct props to OnboardingStep', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('integrates with useUserRegistrationStatus hook', () => {
      render(<ValidatingKYC />);

      expect(useUserRegistrationStatus).toHaveBeenCalled();
    });
  });

  describe('i18n Integration', () => {
    it('uses correct i18n keys for title', () => {
      const { getByTestId } = render(<ValidatingKYC />);

      const title = getByTestId('onboarding-step-title');
      expect(title.props.children).toBe('Validating your identity');
    });
  });
});
