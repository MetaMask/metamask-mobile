import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RewardsReferralView from './RewardsReferralView';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  build: jest.fn().mockReturnValue({ event: 'REWARDS_REFERRALS_VIEWED' }),
});

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    REWARDS_REFERRALS_VIEWED: 'REWARDS_REFERRALS_VIEWED',
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.referral_title': 'Referrals',
    };
    return translations[key] || key;
  },
}));

jest.mock(
  '../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ title, onBack }: { title: string; onBack: () => void }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: 'header-back-button',
          }),
        ),
    };
  },
);

jest.mock('../../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: ({
    children,
    view,
  }: {
    children: React.ReactNode;
    navigation: unknown;
    view: string;
  }) => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: `error-boundary-${view.toLowerCase()}` },
      children,
    );
  },
}));

jest.mock('../components/ReferralDetails/ReferralDetails', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(
        View,
        { testID: 'referral-details' },
        ReactActual.createElement(Text, null, 'Referral Details Component'),
      ),
  };
});

describe('RewardsReferralView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      expect(() => render(<RewardsReferralView />)).not.toThrow();
    });

    it('renders the header with the referral title', () => {
      const { getByText } = render(<RewardsReferralView />);

      expect(getByText('Referrals')).toBeOnTheScreen();
    });

    it('renders the ReferralDetails component', () => {
      const { getByTestId, getByText } = render(<RewardsReferralView />);

      expect(getByTestId('referral-details')).toBeOnTheScreen();
      expect(getByText('Referral Details Component')).toBeOnTheScreen();
    });

    it('wraps content in ErrorBoundary with correct view name', () => {
      const { getByTestId } = render(<RewardsReferralView />);

      expect(
        getByTestId('error-boundary-referralrewardsview'),
      ).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('navigates back when the back button is pressed', () => {
      const { getByTestId } = render(<RewardsReferralView />);

      fireEvent.press(getByTestId('header-back-button'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('analytics', () => {
    it('tracks REWARDS_REFERRALS_VIEWED event on mount', async () => {
      render(<RewardsReferralView />);

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          'REWARDS_REFERRALS_VIEWED',
        );
        expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      });
    });

    it('tracks the event only once across re-renders', async () => {
      const { rerender } = render(<RewardsReferralView />);

      rerender(<RewardsReferralView />);
      rerender(<RewardsReferralView />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('component lifecycle', () => {
    it('cleans up properly when unmounted', () => {
      const { unmount } = render(<RewardsReferralView />);

      expect(() => unmount()).not.toThrow();
    });

    it('handles multiple re-renders gracefully', () => {
      const { rerender } = render(<RewardsReferralView />);

      expect(() => {
        rerender(<RewardsReferralView />);
        rerender(<RewardsReferralView />);
      }).not.toThrow();
    });
  });
});
