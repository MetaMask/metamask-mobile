import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RewardsReferralView, {
  REWARDS_REFERRAL_SAFE_AREA_TEST_ID,
} from './RewardsReferralView';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((styles: string) => (typeof styles === 'string' ? {} : {})),
  }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.referral_title': 'Referrals',
    };
    return translations[key] || key;
  }),
}));

jest.mock('../../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: function MockErrorBoundary({
    children,
    view,
  }: {
    children: React.ReactNode;
    navigation: unknown;
    view: string;
  }) {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: `error-boundary-${view.toLowerCase()}` },
      children,
    );
  },
}));

jest.mock('../components/ReferralDetails/ReferralDetails', () => ({
  __esModule: true,
  default: function MockReferralDetails() {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: 'referral-details' },
      ReactActual.createElement(Text, null, 'Referral Details Component'),
    );
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: jest.fn(() => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })),
    SafeAreaView: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
    }) =>
      ReactActual.createElement(View, { ...props, testID }, children),
  };
});

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  build: jest.fn(() => ({})),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    REWARDS_REFERRALS_VIEWED: 'REWARDS_REFERRALS_VIEWED',
  },
}));

describe('RewardsReferralView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      expect(() => render(<RewardsReferralView />)).not.toThrow();
    });

    it('renders ReferralDetails component', () => {
      const { getByTestId, getByText } = render(<RewardsReferralView />);

      expect(getByTestId('referral-details')).toBeTruthy();
      expect(getByText('Referral Details Component')).toBeTruthy();
    });

    it('wraps content in ErrorBoundary', () => {
      const { getByTestId } = render(<RewardsReferralView />);

      expect(getByTestId('error-boundary-referralrewardsview')).toBeTruthy();
    });
  });

  describe('header and SafeAreaView', () => {
    it('renders SafeAreaView wrapper with correct testID', () => {
      const { getByTestId } = render(<RewardsReferralView />);

      expect(getByTestId(REWARDS_REFERRAL_SAFE_AREA_TEST_ID)).toBeOnTheScreen();
    });

    it('renders HeaderCompactStandard with referral title', () => {
      const { getByText } = render(<RewardsReferralView />);

      expect(getByText('Referrals')).toBeOnTheScreen();
    });

    it('calls navigation.goBack when back button is pressed', () => {
      const { getByTestId } = render(<RewardsReferralView />);
      const backButton = getByTestId('header-back-button');

      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('error boundary integration', () => {
    it('passes correct view prop to ErrorBoundary', () => {
      const { getByTestId } = render(<RewardsReferralView />);

      expect(getByTestId('error-boundary-referralrewardsview')).toBeTruthy();
    });
  });

  describe('component lifecycle', () => {
    it('cleanups properly when unmounted', () => {
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

  describe('integration with child components', () => {
    it('renders ReferralDetails without any props', () => {
      const { getByTestId } = render(<RewardsReferralView />);

      expect(getByTestId('referral-details')).toBeTruthy();
    });
  });
});
