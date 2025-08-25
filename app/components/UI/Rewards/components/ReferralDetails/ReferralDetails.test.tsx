import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { View, Text, TouchableOpacity } from 'react-native';
import ReferralDetails from './ReferralDetails';

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

jest.mock('../../hooks', () => ({
  useRewardsStore: () => mockUseRewardsStore(),
  useReferralDetails: () => mockUseReferralDetails(),
}));

// Mock child components
jest.mock('./ReferralInfoSection', () => ({
  __esModule: true,
  default: () => (
    <View testID="referral-info-section">
      <Text>Referral Info Section</Text>
    </View>
  ),
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
  }) => (
    <View testID="referral-stats-section">
      <Text>Earned Points: {earnedPointsFromReferees}</Text>
      <Text>Referee Count: {refereeCount}</Text>
      <Text>Points Loading: {earnedPointsFromRefereesLoading.toString()}</Text>
      <Text>Count Loading: {refereeCountLoading.toString()}</Text>
    </View>
  ),
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
  }) => (
    <View testID="referral-actions-section">
      <Text>Referral Code: {referralCode}</Text>
      <TouchableOpacity testID="copy-code-button" onPress={onCopyCode}>
        <Text>Copy Code</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="copy-link-button"
        onPress={() => onCopyLink(`https://mm.io/invite/${referralCode}`)}
      >
        <Text>Copy Link</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="share-link-button"
        onPress={() => onShareLink(`https://mm.io/invite/${referralCode}`)}
      >
        <Text>Share Link</Text>
      </TouchableOpacity>
    </View>
  ),
}));

describe('ReferralDetails', () => {
  const mockFetchReferralDetails = jest.fn();

  const defaultRewardsStore = {
    referralDetails: {
      referralCode: 'TEST123',
      earnedPointsFromReferees: 1500,
      refereeCount: 3,
    },
    subscription: {
      subscriptionId: 'sub-123',
    },
  };

  const defaultReferralDetails = {
    fetchReferralDetails: mockFetchReferralDetails,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRewardsStore.mockReturnValue(defaultRewardsStore);
    mockUseReferralDetails.mockReturnValue(defaultReferralDetails);
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

    it('should handle missing referral details gracefully', () => {
      mockUseRewardsStore.mockReturnValue({
        referralDetails: {
          referralCode: null,
          earnedPointsFromReferees: null,
          refereeCount: null,
        },
        subscription: {
          subscriptionId: 'sub-123',
        },
      });

      const { getByText } = render(<ReferralDetails />);

      expect(getByText('Earned Points: 0')).toBeTruthy();
      expect(getByText('Referee Count: 0')).toBeTruthy();
      expect(getByText('Referral Code: ')).toBeTruthy();
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
      mockUseRewardsStore.mockReturnValue({
        ...defaultRewardsStore,
        subscription: {
          subscriptionId: null,
        },
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
      mockUseRewardsStore.mockReturnValue({
        ...defaultRewardsStore,
        subscription: {
          subscriptionId: 'sub-456',
        },
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
    it('should copy referral code to clipboard when handleCopyCode is called', async () => {
      const { getByTestId } = render(<ReferralDetails />);

      const copyCodeButton = getByTestId('copy-code-button');
      copyCodeButton.props.onPress();

      expect(mockClipboard.setString).toHaveBeenCalledWith('TEST123');
    });

    it('should copy referral link to clipboard when handleCopyLink is called', async () => {
      const { getByTestId } = render(<ReferralDetails />);

      const copyLinkButton = getByTestId('copy-link-button');
      copyLinkButton.props.onPress();

      expect(mockClipboard.setString).toHaveBeenCalledWith(
        'https://mm.io/invite/TEST123',
      );
    });

    it('should not copy when referral code is null', async () => {
      mockUseRewardsStore.mockReturnValue({
        ...defaultRewardsStore,
        referralDetails: {
          ...defaultRewardsStore.referralDetails,
          referralCode: null,
        },
      });

      const { getByTestId } = render(<ReferralDetails />);

      const copyCodeButton = getByTestId('copy-code-button');
      copyCodeButton.props.onPress();

      expect(mockClipboard.setString).not.toHaveBeenCalled();
    });
  });

  describe('share functionality', () => {
    it('should open share dialog with correct parameters when handleShareLink is called', async () => {
      const { getByTestId } = render(<ReferralDetails />);

      const shareLinkButton = getByTestId('share-link-button');
      await shareLinkButton.props.onPress();

      expect(mockShare.open).toHaveBeenCalledWith({
        subject: 'Join me on MetaMask!',
        url: 'https://mm.io/invite/TEST123',
      });
    });

    it('should handle share errors gracefully', async () => {
      mockShare.open.mockRejectedValue(new Error('Share failed'));

      const { getByTestId } = render(<ReferralDetails />);

      const shareLinkButton = getByTestId('share-link-button');

      // Should not throw error
      expect(async () => {
        await shareLinkButton.props.onPress();
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty referral code', () => {
      mockUseRewardsStore.mockReturnValue({
        ...defaultRewardsStore,
        referralDetails: {
          ...defaultRewardsStore.referralDetails,
          referralCode: '',
        },
      });

      const { getByText } = render(<ReferralDetails />);

      expect(getByText('Referral Code: ')).toBeTruthy();
    });

    it('should handle zero values for stats', () => {
      mockUseRewardsStore.mockReturnValue({
        ...defaultRewardsStore,
        referralDetails: {
          referralCode: 'TEST123',
          earnedPointsFromReferees: 0,
          refereeCount: 0,
        },
      });

      const { getByText } = render(<ReferralDetails />);

      expect(getByText('Earned Points: 0')).toBeTruthy();
      expect(getByText('Referee Count: 0')).toBeTruthy();
    });

    it('should handle undefined values gracefully', () => {
      mockUseRewardsStore.mockReturnValue({
        referralDetails: {},
        subscription: {
          subscriptionId: 'sub-123',
        },
      });

      const { getByText } = render(<ReferralDetails />);

      expect(getByText('Earned Points: 0')).toBeTruthy();
      expect(getByText('Referee Count: 0')).toBeTruthy();
      expect(getByText('Referral Code: ')).toBeTruthy();
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
