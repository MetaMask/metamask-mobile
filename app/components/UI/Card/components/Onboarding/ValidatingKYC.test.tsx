// Mock dependencies first
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('../../hooks/useUserRegistrationStatus', () => ({
  __esModule: true,
  default: jest.fn(),
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
  };
});

jest.mock('../../../Button', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  const MockButton = ({
    children,
    onPress,
    disabled,
    testID,
    ...props
  }: {
    children: React.ReactNode;
    onPress: () => void;
    disabled?: boolean;
    testID?: string;
    [key: string]: unknown;
  }) =>
    React.createElement(
      TouchableOpacity,
      {
        testID: testID || 'validating-kyc-continue-button',
        onPress,
        disabled,
        ...props,
      },
      React.createElement(Text, {}, children),
    );

  return MockButton;
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const React = jest.requireActual('react');

  return {
    ...RN,
    ActivityIndicator: ({
      testID,
      ...props
    }: {
      testID?: string;
      [key: string]: unknown;
    }) =>
      React.createElement(RN.View, {
        testID: testID || 'activity-indicator',
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
      'card.card_onboarding.continue_button': 'Continue',
    };
    return translations[key] || key;
  }),
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ValidatingKYC from './ValidatingKYC';
import useUserRegistrationStatus from '../../hooks/useUserRegistrationStatus';

describe('ValidatingKYC Component', () => {
  let mockNavigate: jest.Mock;
  let mockUseUserRegistrationStatus: jest.Mock;
  let mockStartPolling: jest.Mock;
  let mockStopPolling: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate = jest.fn();
    mockStartPolling = jest.fn();
    mockStopPolling = jest.fn();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });

    (useRoute as jest.Mock).mockReturnValue({
      params: { sessionUrl: 'https://example.com/session' },
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

    it('renders activity indicator when loading', () => {
      const { getByTestId } = render(<ValidatingKYC />);
      const formFields = getByTestId('onboarding-step-form-fields');
      expect(formFields.children).toHaveLength(1);
      // ActivityIndicator is rendered in the form fields
      expect(formFields).toBeTruthy();
    });

    it('renders no actions (null)', () => {
      const { getByTestId } = render(<ValidatingKYC />);
      const actions = getByTestId('onboarding-step-actions');
      expect(actions).toBeTruthy();
      expect(actions.children).toHaveLength(0);
    });
  });

  describe('Error States', () => {
    it('shows error state when isError is true', () => {
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

      // Component should still render but in error state
      expect(getByTestId('onboarding-step')).toBeTruthy();
      // No buttons are rendered in error state
      const actions = getByTestId('onboarding-step-actions');
      expect(actions.children).toHaveLength(0);
    });

    it('handles error state with null error message', () => {
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
    it('shows loading state when isLoading is true', () => {
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
      const formFields = getByTestId('onboarding-step-form-fields');
      expect(formFields.children).toHaveLength(1);
      // ActivityIndicator is rendered in the form fields
      expect(formFields).toBeTruthy();
    });

    it('handles loading state with verification pending', () => {
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
      const formFields = getByTestId('onboarding-step-form-fields');
      expect(formFields.children).toHaveLength(1);
      // ActivityIndicator is rendered in the form fields
      expect(formFields).toBeTruthy();
    });
  });

  describe('User States - Verification Status Navigation', () => {
    it('navigates to PERSONAL_DETAILS when verificationState is VERIFIED', async () => {
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
        expect(mockNavigate).toHaveBeenCalledWith(
          'CardOnboardingPersonalDetails',
        );
      });
    });

    it('navigates to KYC_FAILED when verificationState is REJECTED', async () => {
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
        expect(mockNavigate).toHaveBeenCalledWith('CardOnboardingKYCFailed');
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

      // Wait a bit to ensure no navigation occurs
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Button Interaction and Navigation', () => {
    it('does not render any buttons', () => {
      const { queryByTestId } = render(<ValidatingKYC />);
      const button = queryByTestId('validating-kyc-continue-button');
      expect(button).toBeNull();
    });
  });

  describe('Navigation Integration', () => {
    it('uses useNavigation hook', () => {
      render(<ValidatingKYC />);
      expect(useNavigation).toHaveBeenCalled();
    });

    it('calls navigate with correct route for automatic navigation', async () => {
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
        expect(mockNavigate).toHaveBeenCalledWith(
          'CardOnboardingPersonalDetails',
        );
      });
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
