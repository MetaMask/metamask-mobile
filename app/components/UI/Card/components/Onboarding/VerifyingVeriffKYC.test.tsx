import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import VerifyingVeriffKYC from './VerifyingVeriffKYC';
import Routes from '../../../../../constants/navigation/Routes';
import useUserRegistrationStatus from '../../hooks/useUserRegistrationStatus';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => false),
}));

jest.mock('../../hooks/useUserRegistrationStatus');

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({ event: 'test' }),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../util/metrics', () => ({
  ...jest.requireActual('../../util/metrics'),
  CardScreens: {
    VERIFYING_VERIFF_KYC: 'VERIFYING_VERIFF_KYC',
  },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((className?: string) => ({ className })),
  }),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/glassHeaders',
  () => ({
    selectGlassHeadersEnabled: jest.fn(() => false),
  }),
);

jest.mock('../../hooks/useCardHeaderHandlers', () => ({
  useCardHeaderHandlers: () => ({
    onClose: jest.fn(),
    closeButtonProps: { testID: 'card-header-close-button' },
  }),
}));

jest.mock(
  '../../../../../component-library/components-temp/HeaderStandardGlass',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () =>
        ReactActual.createElement(View, { testID: 'header-standard-glass' }),
    };
  },
);

jest.mock('./ImmersveVerifyingIdentityAnimation', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, {
        testID: 'immersve-verifying-identity-animation',
      }),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      ...props
    }: React.PropsWithChildren<{ testID?: string }>) =>
      ReactActual.createElement(View, { testID, ...props }, children),
    BoxAlignItems: { Center: 'Center' },
    BoxJustifyContent: { Center: 'Center', End: 'End' },
    TitleStandard: ({
      title,
      bottomLabel,
      titleProps,
      bottomLabelProps,
      topAccessory,
    }: {
      title?: string;
      bottomLabel?: string;
      titleProps?: { testID?: string };
      bottomLabelProps?: { testID?: string };
      topAccessory?: React.ReactNode;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'title-standard' },
        topAccessory,
        ReactActual.createElement(
          Text,
          { testID: titleProps?.testID || 'onboarding-title' },
          title,
        ),
        ReactActual.createElement(
          Text,
          { testID: bottomLabelProps?.testID || 'onboarding-description' },
          bottomLabel,
        ),
      ),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: { [key: string]: string } = {
      'card.card_onboarding.verifying_veriff_kyc.in_progress_title':
        'Verifying your identity',
      'card.card_onboarding.verifying_veriff_kyc.in_progress_description':
        "This usually takes a few seconds. Don't close the app.",
    };
    return mockStrings[key] || key;
  }),
}));

const POLLING_TIMEOUT_MS = 30000;

describe('VerifyingVeriffKYC', () => {
  const mockNavigate = jest.fn();
  const mockReset = jest.fn();
  const mockStartPolling = jest.fn();
  const mockStopPolling = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
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

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Render', () => {
    it('renders the centred terminal layout with illustration', () => {
      const { getByTestId } = render(<VerifyingVeriffKYC />);

      expect(getByTestId('verifying-veriff-kyc-container')).toBeTruthy();
      expect(getByTestId('header-standard-glass')).toBeTruthy();
      expect(getByTestId('verifying-veriff-kyc-illustration')).toBeTruthy();
      expect(getByTestId('immersve-verifying-identity-animation')).toBeTruthy();
      expect(getByTestId('verifying-veriff-kyc-title')).toBeTruthy();
      expect(getByTestId('verifying-veriff-kyc-description')).toBeTruthy();
    });

    it('displays correct title text', () => {
      const { getByTestId } = render(<VerifyingVeriffKYC />);

      expect(getByTestId('verifying-veriff-kyc-title').props.children).toBe(
        'Verifying your identity',
      );
    });

    it('displays correct description text', () => {
      const { getByTestId } = render(<VerifyingVeriffKYC />);

      expect(
        getByTestId('verifying-veriff-kyc-description').props.children,
      ).toBe("This usually takes a few seconds. Don't close the app.");
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

      expect(mockStopPolling).toHaveBeenCalled();
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
    it('does not navigate immediately when verificationState is PENDING', () => {
      (useUserRegistrationStatus as jest.Mock).mockReturnValue({
        verificationState: 'PENDING',
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<VerifyingVeriffKYC />);

      expect(mockReset).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('continues to render the verifying illustration when verificationState is PENDING', () => {
      (useUserRegistrationStatus as jest.Mock).mockReturnValue({
        verificationState: 'PENDING',
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      const { getByTestId } = render(<VerifyingVeriffKYC />);

      expect(getByTestId('verifying-veriff-kyc-illustration')).toBeTruthy();
      expect(getByTestId('immersve-verifying-identity-animation')).toBeTruthy();
    });
  });

  describe('Polling Timeout', () => {
    it('navigates to KYC_PENDING after 30 seconds of polling', () => {
      (useUserRegistrationStatus as jest.Mock).mockReturnValue({
        verificationState: 'PENDING',
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<VerifyingVeriffKYC />);

      expect(mockReset).not.toHaveBeenCalled();

      jest.advanceTimersByTime(POLLING_TIMEOUT_MS);

      expect(mockStopPolling).toHaveBeenCalled();
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.CARD.ONBOARDING.KYC_PENDING }],
      });
    });

    it('does not navigate to KYC_PENDING before 30 seconds', () => {
      (useUserRegistrationStatus as jest.Mock).mockReturnValue({
        verificationState: 'PENDING',
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
      });

      render(<VerifyingVeriffKYC />);

      jest.advanceTimersByTime(POLLING_TIMEOUT_MS - 1);

      expect(mockReset).not.toHaveBeenCalled();
    });

    it('clears timeout when VERIFIED state is reached before timeout', async () => {
      const { rerender } = render(<VerifyingVeriffKYC />);

      jest.advanceTimersByTime(15000);

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

      mockReset.mockClear();
      jest.advanceTimersByTime(POLLING_TIMEOUT_MS);

      expect(mockReset).not.toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.CARD.ONBOARDING.KYC_PENDING }],
      });
    });

    it('clears timeout when REJECTED state is reached before timeout', async () => {
      const { rerender } = render(<VerifyingVeriffKYC />);

      jest.advanceTimersByTime(15000);

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

      mockReset.mockClear();
      jest.advanceTimersByTime(POLLING_TIMEOUT_MS);

      expect(mockReset).not.toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.CARD.ONBOARDING.KYC_PENDING }],
      });
    });

    it('clears timeout on unmount', () => {
      const { unmount } = render(<VerifyingVeriffKYC />);

      unmount();

      jest.advanceTimersByTime(POLLING_TIMEOUT_MS);

      expect(mockReset).not.toHaveBeenCalled();
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
        provider: 'baanx',
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
    it('uses correct i18n key for in-progress title', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingVeriffKYC />);

      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.verifying_veriff_kyc.in_progress_title',
      );
    });

    it('uses correct i18n key for in-progress description', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');

      render(<VerifyingVeriffKYC />);

      expect(strings).toHaveBeenCalledWith(
        'card.card_onboarding.verifying_veriff_kyc.in_progress_description',
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
});
