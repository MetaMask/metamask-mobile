import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import ReferralDetails from './ReferralDetails';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

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
const mockUseRewardsStore = jest.fn();
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

  const defaultRewardsStore = {
    referralDetails: {
      referralCode: 'TEST123',
      refereeCount: 3,
    },
    balance: {
      total: 2000,
      refereePortion: 1500,
      updatedAt: new Date('2024-01-01'),
    },
    subscriptionId: 'sub-123',
    seasonStatusLoading: false,
  };

  const defaultReferralDetails = {
    fetchReferralDetails: mockFetchReferralDetails,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRewardsStore.mockReturnValue(defaultRewardsStore);
    mockUseReferralDetails.mockReturnValue(defaultReferralDetails);

    // Setup Redux selector mocks
    mockUseSelector.mockImplementation((selector) => {
      // Mock the selectors used in ReferralDetails component
      const mockState = {
        rewards: {
          referralCode: defaultRewardsStore.referralDetails.referralCode,
          refereeCount: defaultRewardsStore.referralDetails.refereeCount,
          balanceRefereePortion: defaultRewardsStore.balance.refereePortion,
          seasonStatusLoading: defaultRewardsStore.seasonStatusLoading,
          subscriptionId: defaultRewardsStore.subscriptionId,
        },
      };

      return selector(mockState);
    });
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
      const updatedStore = {
        ...defaultRewardsStore,
        subscriptionId: null,
      };
      mockUseRewardsStore.mockReturnValue(updatedStore);

      // Update Redux selectors
      mockUseSelector.mockImplementation((selector) => {
        const mockState = {
          rewards: {
            referralCode: updatedStore.referralDetails.referralCode,
            refereeCount: updatedStore.referralDetails.refereeCount,
            balanceRefereePortion: updatedStore.balance.refereePortion,
            seasonStatusLoading: updatedStore.seasonStatusLoading,
            subscriptionId: updatedStore.subscriptionId,
          },
        };
        return selector(mockState);
      });

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
      const updatedStore = {
        ...defaultRewardsStore,
        subscriptionId: 'sub-456',
      };
      mockUseRewardsStore.mockReturnValue(updatedStore);

      // Update Redux selectors for new subscription ID
      mockUseSelector.mockImplementation((selector) => {
        const mockState = {
          rewards: {
            referralCode: updatedStore.referralDetails.referralCode,
            refereeCount: updatedStore.referralDetails.refereeCount,
            balanceRefereePortion: updatedStore.balance.refereePortion,
            seasonStatusLoading: updatedStore.seasonStatusLoading,
            subscriptionId: updatedStore.subscriptionId,
          },
        };
        return selector(mockState);
      });

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

      // Ensure Redux selectors are properly mocked for this test too
      mockUseSelector.mockImplementation((selector) => {
        const mockState = {
          rewards: {
            referralCode: defaultRewardsStore.referralDetails.referralCode,
            refereeCount: defaultRewardsStore.referralDetails.refereeCount,
            balanceRefereePortion: defaultRewardsStore.balance.refereePortion,
            seasonStatusLoading: defaultRewardsStore.seasonStatusLoading,
            subscriptionId: defaultRewardsStore.subscriptionId,
          },
        };
        return selector(mockState);
      });

      const { getByText } = render(<ReferralDetails />);

      expect(getByText('Count Loading: true')).toBeTruthy();
      expect(getByText('Points Loading: false')).toBeTruthy(); // Points loading is hardcoded to false
    });

    it('should show not loading when fetch is complete', () => {
      const { getByText } = render(<ReferralDetails />);

      expect(getByText('Count Loading: false')).toBeTruthy();
      expect(getByText('Points Loading: false')).toBeTruthy();
    });
  });

  describe('copy functionality', () => {
    it('should not copy when referral code is null', async () => {
      const updatedStore = {
        ...defaultRewardsStore,
        referralDetails: {
          ...defaultRewardsStore.referralDetails,
          referralCode: null,
        },
        balance: defaultRewardsStore.balance,
        seasonStatusLoading: defaultRewardsStore.seasonStatusLoading,
      };
      mockUseRewardsStore.mockReturnValue(updatedStore);

      // Update Redux selectors
      mockUseSelector.mockImplementation((selector) => {
        const mockState = {
          rewards: {
            referralCode: updatedStore.referralDetails.referralCode,
            refereeCount: updatedStore.referralDetails.refereeCount,
            balanceRefereePortion: updatedStore.balance.refereePortion,
            seasonStatusLoading: updatedStore.seasonStatusLoading,
            subscriptionId: updatedStore.subscriptionId,
          },
        };
        return selector(mockState);
      });

      const { getByTestId } = render(<ReferralDetails />);

      const copyCodeButton = getByTestId('copy-code-button');
      copyCodeButton.props.onPress();

      expect(mockClipboard.setString).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty referral code', () => {
      const updatedStore = {
        ...defaultRewardsStore,
        referralDetails: {
          ...defaultRewardsStore.referralDetails,
          referralCode: '',
        },
        balance: defaultRewardsStore.balance,
        seasonStatusLoading: defaultRewardsStore.seasonStatusLoading,
      };
      mockUseRewardsStore.mockReturnValue(updatedStore);

      // Update Redux selectors
      mockUseSelector.mockImplementation((selector) => {
        const mockState = {
          rewards: {
            referralCode: updatedStore.referralDetails.referralCode,
            refereeCount: updatedStore.referralDetails.refereeCount,
            balanceRefereePortion: updatedStore.balance.refereePortion,
            seasonStatusLoading: updatedStore.seasonStatusLoading,
            subscriptionId: updatedStore.subscriptionId,
          },
        };
        return selector(mockState);
      });

      const { getByText } = render(<ReferralDetails />);

      expect(getByText('Referral Code: ')).toBeTruthy();
    });

    it('should handle zero values for stats', () => {
      const updatedStore = {
        ...defaultRewardsStore,
        referralDetails: {
          referralCode: 'TEST123',
          refereeCount: 0,
        },
        balance: {
          total: 0,
          refereePortion: 0,
          updatedAt: new Date('2024-01-01'),
        },
        seasonStatusLoading: false,
      };
      mockUseRewardsStore.mockReturnValue(updatedStore);

      // Update Redux selectors
      mockUseSelector.mockImplementation((selector) => {
        const mockState = {
          rewards: {
            referralCode: updatedStore.referralDetails.referralCode,
            refereeCount: updatedStore.referralDetails.refereeCount,
            balanceRefereePortion: updatedStore.balance.refereePortion,
            seasonStatusLoading: updatedStore.seasonStatusLoading,
            subscriptionId: updatedStore.subscriptionId,
          },
        };
        return selector(mockState);
      });

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
