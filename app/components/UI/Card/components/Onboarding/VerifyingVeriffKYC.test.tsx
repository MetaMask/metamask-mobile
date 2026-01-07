import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import VerifyingVeriffKYC from './VerifyingVeriffKYC';
import Routes from '../../../../../constants/navigation/Routes';
import useUserRegistrationStatus from '../../hooks/useUserRegistrationStatus';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock useUserRegistrationStatus hook
jest.mock('../../hooks/useUserRegistrationStatus');

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
    CARD_VIEWED: 'CARD_VIEWED',
  },
}));

// Mock metrics util
jest.mock('../../util/metrics', () => ({
  CardScreens: {
    VERIFYING_VERIFF_KYC: 'VERIFYING_VERIFF_KYC',
  },
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
    TextVariant: {
      BodyMd: 'BodyMd',
    },
  };
});

// Mock i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: { [key: string]: string } = {
      'card.card_onboarding.verifying_veriff_kyc.title':
        'Verifying your identity',
      'card.card_onboarding.verifying_veriff_kyc.description':
        'Please wait while we verify your identity.',
      'card.card_onboarding.verifying_veriff_kyc.helper_text':
        "This usually takes a few seconds. Please don't close the app.",
    };
    return mockStrings[key] || key;
  }),
}));

describe('VerifyingVeriffKYC', () => {
  const mockNavigate = jest.fn();
  const mockReset = jest.fn();
  const mockStartPolling = jest.fn();
  const mockStopPolling = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackEvent.mockClear();
    mockCreateEventBuilder.mockClear();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      reset: mockReset,
    });

    (useUserRegistrationStatus as jest.Mock).mockReturnValue({
      verificationState: 'PENDING',
      startPolling: mockStartPolling,
      stopPolling: mockStopPolling,
    });
  });

  describe('Initial Render', () => {
    it('renders all elements with correct testIDs', () => {
      const { getByTestId } = render(<VerifyingVeriffKYC />);

      expect(getByTestId('onboarding-step')).toBeTruthy();
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form-fields')).toBeTruthy();
    });

    it('renders spinner with correct testID', () => {
      const { getByTestId } = render(<VerifyingVeriffKYC />);

      expect(getByTestId('verifying-veriff-kyc-spinner')).toBeTruthy();
    });

    it('displays correct title text', () => {
      const { getByTestId } = render(<VerifyingVeriffKYC />);

      const title = getByTestId('onboarding-step-title');

      expect(title.props.children).toBe('Verifying your identity');
    });

    it('displays correct description text', () => {
      const { getByTestId } = render(<VerifyingVeriffKYC />);

      const description = getByTestId('onboarding-step-description');

      expect(description.props.children).toBe(
        'Please wait while we verify your identity.',
      );
    });

    it('passes null for actions prop', () => {
      const { getByTestId } = render(<VerifyingVeriffKYC />);

      const actions = getByTestId('onboarding-step-actions');

      expect(actions.props.children).toBeNull();
    });
  });

  describe('Polling Behavior', () => {
    it('calls startPolling on mount', () => {
      render(<VerifyingVeriffKYC />);

      expect(mockStartPolling).toHaveBeenCalledTimes(1);
    });

    it('calls stopPolling on unmount', () => {
      const { unmount } = render(<VerifyingVeriffKYC />);

      unmount();

      expect(mockStopPolling).toHaveBeenCalledTimes(1);
    });

    it('starts polling before stopPolling is called on unmount', () => {
      const callOrder: string[] = [];
      mockStartPolling.mockImplementation(() => callOrder.push('start'));
      mockStopPolling.mockImplementation(() => callOrder.push('stop'));

      const { unmount } = render(<VerifyingVeriffKYC />);
      unmount();

      expect(callOrder).toEqual(['start', 'stop']);
    });
  });

  describe('Navigation on VERIFIED state', () => {
    it('navigates to PERSONAL_DETAILS when verificationState is VERIFIED', async () => {
      (useUserRegistrationStatus as jest.Mock).mockReturnValue({
        verificationState: 'VERIFIED',
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<VerifyingVeriffKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.PERSONAL_DETAILS }],
        });
      });
    });

    it('resets navigation stack when navigating to PERSONAL_DETAILS', async () => {
      (useUserRegistrationStatus as jest.Mock).mockReturnValue({
        verificationState: 'VERIFIED',
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<VerifyingVeriffKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledTimes(1);
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });

  describe('Navigation on REJECTED state', () => {
    it('navigates to KYC_FAILED when verificationState is REJECTED', async () => {
      (useUserRegistrationStatus as jest.Mock).mockReturnValue({
        verificationState: 'REJECTED',
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<VerifyingVeriffKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.KYC_FAILED }],
        });
      });
    });

    it('resets navigation stack when navigating to KYC_FAILED', async () => {
      (useUserRegistrationStatus as jest.Mock).mockReturnValue({
        verificationState: 'REJECTED',
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<VerifyingVeriffKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledTimes(1);
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });

  describe('PENDING state behavior', () => {
    it('does not navigate when verificationState is PENDING', () => {
      (useUserRegistrationStatus as jest.Mock).mockReturnValue({
        verificationState: 'PENDING',
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<VerifyingVeriffKYC />);

      expect(mockReset).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('continues to render spinner when verificationState is PENDING', () => {
      (useUserRegistrationStatus as jest.Mock).mockReturnValue({
        verificationState: 'PENDING',
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      const { getByTestId } = render(<VerifyingVeriffKYC />);

      expect(getByTestId('verifying-veriff-kyc-spinner')).toBeTruthy();
    });
  });

  describe('State Transitions', () => {
    it('navigates when state changes from PENDING to VERIFIED', async () => {
      const { rerender } = render(<VerifyingVeriffKYC />);

      expect(mockReset).not.toHaveBeenCalled();

      (useUserRegistrationStatus as jest.Mock).mockReturnValue({
        verificationState: 'VERIFIED',
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      rerender(<VerifyingVeriffKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.PERSONAL_DETAILS }],
        });
      });
    });

    it('navigates when state changes from PENDING to REJECTED', async () => {
      const { rerender } = render(<VerifyingVeriffKYC />);

      expect(mockReset).not.toHaveBeenCalled();

      (useUserRegistrationStatus as jest.Mock).mockReturnValue({
        verificationState: 'REJECTED',
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      rerender(<VerifyingVeriffKYC />);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.KYC_FAILED }],
        });
      });
    });
  });

  describe('Metrics Tracking', () => {
    it('tracks CARD_VIEWED event on mount', () => {
      render(<VerifyingVeriffKYC />);

      expect(mockCreateEventBuilder).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks event with correct screen property', () => {
      render(<VerifyingVeriffKYC />);

      const eventBuilder = mockCreateEventBuilder.mock.results[0].value;

      expect(eventBuilder.addProperties).toHaveBeenCalledWith({
        screen: 'VERIFYING_VERIFF_KYC',
      });
    });

    it('tracks event only once on mount', () => {
      const { rerender } = render(<VerifyingVeriffKYC />);

      rerender(<VerifyingVeriffKYC />);
      rerender(<VerifyingVeriffKYC />);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('i18n Integration', () => {
    it('uses correct i18n key for title', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingVeriffKYC />);

      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.verifying_veriff_kyc.title',
      );
    });

    it('uses correct i18n key for description', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingVeriffKYC />);

      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.verifying_veriff_kyc.description',
      );
    });

    it('uses correct i18n key for helper text', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingVeriffKYC />);

      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.verifying_veriff_kyc.helper_text',
      );
    });
  });

  describe('Hook Integration', () => {
    it('calls useNavigation hook', () => {
      render(<VerifyingVeriffKYC />);

      expect(useNavigation).toHaveBeenCalled();
    });

    it('calls useUserRegistrationStatus hook', () => {
      render(<VerifyingVeriffKYC />);

      expect(useUserRegistrationStatus).toHaveBeenCalled();
    });
  });

  describe('Component Structure', () => {
    it('renders form fields containing spinner and helper text', () => {
      const { getByTestId } = render(<VerifyingVeriffKYC />);

      const formFields = getByTestId('onboarding-step-form-fields');
      const spinner = getByTestId('verifying-veriff-kyc-spinner');

      expect(formFields).toBeTruthy();
      expect(spinner).toBeTruthy();
    });

    it('passes correct props to OnboardingStep', () => {
      const { getByTestId } = render(<VerifyingVeriffKYC />);

      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');
      const actions = getByTestId('onboarding-step-actions');

      expect(title.props.children).toBe('Verifying your identity');
      expect(description.props.children).toBe(
        'Please wait while we verify your identity.',
      );
      expect(actions.props.children).toBeNull();
    });
  });
});
