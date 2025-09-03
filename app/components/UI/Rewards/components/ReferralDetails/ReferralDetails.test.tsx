import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import ReferralDetails from './ReferralDetails';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock individual selectors
jest.mock('../../../../../reducers/rewards/selectors', () => ({
  selectReferralCode: jest.fn(),
  selectReferralCount: jest.fn(),
  selectBalanceRefereePortion: jest.fn(),
  selectSeasonStatusLoading: jest.fn(),
  selectSubscriptionId: jest.fn(),
}));

// Import the mocked selectors
import {
  selectReferralCode,
  selectReferralCount,
  selectBalanceRefereePortion,
  selectSeasonStatusLoading,
  selectSubscriptionId,
} from '../../../../../reducers/rewards/selectors';

const mockSelectReferralCode = selectReferralCode as jest.MockedFunction<
  typeof selectReferralCode
>;
const mockSelectReferralCount = selectReferralCount as jest.MockedFunction<
  typeof selectReferralCount
>;
const mockSelectBalanceRefereePortion =
  selectBalanceRefereePortion as jest.MockedFunction<
    typeof selectBalanceRefereePortion
  >;
const mockSelectSeasonStatusLoading =
  selectSeasonStatusLoading as jest.MockedFunction<
    typeof selectSeasonStatusLoading
  >;
const mockSelectSubscriptionId = selectSubscriptionId as jest.MockedFunction<
  typeof selectSubscriptionId
>;

// Mock Clipboard
const mockClipboard = {
  setString: jest.fn(),
};
jest.mock('@react-native-clipboard/clipboard', () => mockClipboard);

// Mock Share
const mockShare = {
  open: jest.fn(),
};
jest.mock('react-native-share', () => mockShare);

// Mock strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.referral.actions.share_referral_subject': 'Join me on MetaMask!',
    };
    return translations[key] || key;
  }),
}));

// Mock hooks
const mockUseReferralDetails = jest.fn();

jest.mock('../../hooks/useReferralDetails', () => ({
  useReferralDetails: () => mockUseReferralDetails(),
}));

// Mock child components
jest.mock('./ReferralInfoSection', () => ({
  __esModule: true,
  default: () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: 'referral-info-section' },
      ReactActual.createElement(Text, null, 'Referral Info Section'),
    );
  },
}));

jest.mock('./ReferralStatsSection', () => ({
  __esModule: true,
  default: ({
    earnedPointsFromReferees,
    refereeCount,
    earnedPointsFromRefereesLoading,
    refereeCountLoading,
  }: {
    earnedPointsFromReferees: number;
    refereeCount: number;
    earnedPointsFromRefereesLoading: boolean;
    refereeCountLoading: boolean;
  }) => {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: 'referral-stats-section' },
      ReactActual.createElement(
        Text,
        null,
        `Earned Points: ${earnedPointsFromReferees}`,
      ),
      ReactActual.createElement(Text, null, `Referee Count: ${refereeCount}`),
      ReactActual.createElement(
        Text,
        null,
        `Points Loading: ${earnedPointsFromRefereesLoading.toString()}`,
      ),
      ReactActual.createElement(
        Text,
        null,
        `Count Loading: ${refereeCountLoading.toString()}`,
      ),
    );
  },
}));

jest.mock('./ReferralActionsSection', () => ({
  __esModule: true,
  default: ({
    referralCode,
    onCopyCode,
    onCopyLink,
    onShareLink,
  }: {
    referralCode: string;
    onCopyCode: () => void;
    onCopyLink: (link: string) => void;
    onShareLink: (link: string) => void;
  }) => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: 'referral-actions-section' },
      ReactActual.createElement(Text, null, `Referral Code: ${referralCode}`),
      ReactActual.createElement(
        TouchableOpacity,
        { testID: 'copy-code-button', onPress: onCopyCode },
        ReactActual.createElement(Text, null, 'Copy Code'),
      ),
      ReactActual.createElement(
        TouchableOpacity,
        {
          testID: 'copy-link-button',
          onPress: () => onCopyLink(`https://mm.io/invite/${referralCode}`),
        },
        ReactActual.createElement(Text, null, 'Copy Link'),
      ),
      ReactActual.createElement(
        TouchableOpacity,
        {
          testID: 'share-link-button',
          onPress: () => onShareLink(`https://mm.io/invite/${referralCode}`),
        },
        ReactActual.createElement(Text, null, 'Share Link'),
      ),
    );
  },
}));

describe('ReferralDetails', () => {
  const mockFetchReferralDetails = jest.fn();

  // Default values for individual selectors
  const defaultValues = {
    referralCode: 'TEST123',
    refereeCount: 3,
    balanceRefereePortion: 1500,
    seasonStatusLoading: false,
    subscriptionId: 'sub-123',
  };

  const defaultReferralDetails = {
    fetchReferralDetails: mockFetchReferralDetails,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReferralDetails.mockReturnValue(defaultReferralDetails);

    // Setup individual selector mocks
    mockSelectReferralCode.mockReturnValue(defaultValues.referralCode);
    mockSelectReferralCount.mockReturnValue(defaultValues.refereeCount);
    mockSelectBalanceRefereePortion.mockReturnValue(
      defaultValues.balanceRefereePortion,
    );
    mockSelectSeasonStatusLoading.mockReturnValue(
      defaultValues.seasonStatusLoading,
    );
    mockSelectSubscriptionId.mockReturnValue(defaultValues.subscriptionId);

    // Setup useSelector to call the appropriate selector function
    mockUseSelector.mockImplementation(
      (selector) => selector({} as unknown), // The selectors are mocked, so we don't need the actual state
    );
  });

  describe('rendering', () => {
    it('should render all child components correctly', () => {
      const { getByTestId, getByText } = render(<ReferralDetails />);

      expect(getByTestId('referral-info-section')).toBeTruthy();
      expect(getByTestId('referral-stats-section')).toBeTruthy();
      expect(getByTestId('referral-actions-section')).toBeTruthy();
      expect(getByText('Earned Points: 1500')).toBeTruthy();
      expect(getByText('Referee Count: 3')).toBeTruthy();
      expect(getByText('Referral Code: TEST123')).toBeTruthy();
    });
  });

  describe('data fetching', () => {
    it('should fetch referral details when subscription ID is available', async () => {
      render(<ReferralDetails />);

      await waitFor(() => {
        expect(mockFetchReferralDetails).toHaveBeenCalledTimes(1);
      });
    });

    it('should not fetch referral details when subscription ID is missing', async () => {
      // Override subscription ID to null for this test
      mockSelectSubscriptionId.mockReturnValue(null);

      render(<ReferralDetails />);

      await waitFor(() => {
        expect(mockFetchReferralDetails).not.toHaveBeenCalled();
      });
    });

    it('should refetch when subscription ID changes', async () => {
      const { rerender } = render(<ReferralDetails />);

      await waitFor(() => {
        expect(mockFetchReferralDetails).toHaveBeenCalledTimes(1);
      });

      // Change subscription ID
      mockSelectSubscriptionId.mockReturnValue('sub-456');

      rerender(<ReferralDetails />);

      await waitFor(() => {
        expect(mockFetchReferralDetails).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('loading states', () => {
    it('should pass loading state to ReferralStatsSection', () => {
      mockUseReferralDetails.mockReturnValue({
        ...defaultReferralDetails,
        isLoading: true,
      });

      const { getByText } = render(<ReferralDetails />);

      expect(getByText('Count Loading: true')).toBeTruthy();
      expect(getByText('Points Loading: false')).toBeTruthy(); // Points loading comes from seasonStatusLoading
    });

    it('should show not loading when fetch is complete', () => {
      const { getByText } = render(<ReferralDetails />);

      expect(getByText('Count Loading: false')).toBeTruthy();
      expect(getByText('Points Loading: false')).toBeTruthy();
    });
  });

  describe('copy functionality', () => {
    it('should not copy when referral code is null', async () => {
      // Override referral code to null for this test
      mockSelectReferralCode.mockReturnValue(null);

      const { getByTestId } = render(<ReferralDetails />);

      const copyCodeButton = getByTestId('copy-code-button');
      copyCodeButton.props.onPress();

      expect(mockClipboard.setString).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty referral code', () => {
      // Override referral code to empty string for this test
      mockSelectReferralCode.mockReturnValue('');

      const { getByText } = render(<ReferralDetails />);

      expect(getByText('Referral Code: ')).toBeTruthy();
    });

    it('should handle zero values for stats', () => {
      // Override values to zero for this test
      mockSelectReferralCount.mockReturnValue(0);
      mockSelectBalanceRefereePortion.mockReturnValue(0);

      const { getByText } = render(<ReferralDetails />);

      expect(getByText('Earned Points: 0')).toBeTruthy();
      expect(getByText('Referee Count: 0')).toBeTruthy();
    });
  });

  describe('component lifecycle', () => {
    it('should render without crashing', () => {
      expect(() => render(<ReferralDetails />)).not.toThrow();
    });

    it('should cleanup properly when unmounted', () => {
      const { unmount } = render(<ReferralDetails />);

      expect(() => unmount()).not.toThrow();
    });
  });
});
