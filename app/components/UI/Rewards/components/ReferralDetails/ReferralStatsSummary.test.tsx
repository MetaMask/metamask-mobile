import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import ReferralStatsSummary from './ReferralStatsSummary';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  Provider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.season_status_error.error_fetching_title':
        "Season balance couldn't be loaded",
      'rewards.season_status_error.error_fetching_description':
        'Check your connection and try again.',
      'rewards.referral_details_error.error_fetching_title':
        "Referral details couldn't be loaded",
      'rewards.referral_details_error.error_fetching_description':
        'Check your connection and try again.',
      'rewards.referral_details_error.retry_button': 'Retry',
    };
    return translations[key] || key;
  }),
}));

// Mock useReferralDetails hook
jest.mock('../../hooks/useReferralDetails', () => ({
  useReferralDetails: jest.fn(),
}));

const mockUseReferralDetails = jest.requireMock(
  '../../hooks/useReferralDetails',
).useReferralDetails;

// Mock RewardsErrorBanner
jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      description,
      onConfirm,
      confirmButtonLabel,
    }: {
      title: string;
      description: string;
      onConfirm?: () => void;
      confirmButtonLabel?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'rewards-error-banner' },
        ReactActual.createElement(Text, { testID: 'error-title' }, title),
        ReactActual.createElement(
          Text,
          { testID: 'error-description' },
          description,
        ),
        onConfirm &&
          ReactActual.createElement(
            TouchableOpacity,
            { testID: 'error-retry-button', onPress: onConfirm },
            ReactActual.createElement(
              Text,
              null,
              confirmButtonLabel || 'Retry',
            ),
          ),
      ),
  };
});

// Mock ReferralStatsSection
jest.mock('./ReferralStatsSection', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: {
      referralPointsTitle?: string;
      totalReferralsTitle?: string;
      earnedPointsFromReferees?: number | null;
      refereeCount?: number | null;
      earnedPointsFromRefereesLoading?: boolean;
      refereeCountLoading?: boolean;
      refereeCountError?: boolean;
    }) =>
      ReactActual.createElement(
        View,
        {
          testID: 'referral-stats-section',
          'data-props': JSON.stringify(props),
        },
        ReactActual.createElement(Text, null, 'ReferralStatsSection'),
      ),
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SelectorFunction = (state: any) => any;

describe('ReferralStatsSummary', () => {
  const mockFetchReferralDetails = jest.fn();

  const defaultSelectorValues: Record<string, unknown> = {
    selectReferralCode: 'REFER123',
    selectReferralCount: 5,
    selectBalanceRefereePortion: 1500,
    selectSeasonStatusError: false,
    selectSeasonStartDate: '2024-01-01',
    selectReferralDetailsLoading: false,
    selectReferralDetailsError: false,
  };

  const setupSelectors = (overrides: Record<string, unknown> = {}) => {
    const values = { ...defaultSelectorValues, ...overrides };
    mockUseSelector.mockImplementation((selector: SelectorFunction) => {
      const name = selector.name;
      if (name in values) {
        return values[name];
      }
      return null;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupSelectors();
    mockUseReferralDetails.mockReturnValue({
      fetchReferralDetails: mockFetchReferralDetails,
    });
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      expect(() => render(<ReferralStatsSummary />)).not.toThrow();
    });

    it('should render ReferralStatsSection when there are no errors', () => {
      // Act
      const { getByTestId, queryByTestId } = render(
        <ReferralStatsSummary
          referralPointsTitle="Earned from referrals"
          totalReferralsTitle="Referrals"
        />,
      );

      // Assert
      expect(getByTestId('referral-stats-section')).toBeTruthy();
      expect(queryByTestId('rewards-error-banner')).toBeNull();
    });

    it('should pass referralPointsTitle and totalReferralsTitle props to ReferralStatsSection', () => {
      // Act
      const { getByTestId } = render(
        <ReferralStatsSummary
          referralPointsTitle="Points from referrals"
          totalReferralsTitle="Total referrals"
        />,
      );

      // Assert
      const statsSection = getByTestId('referral-stats-section');
      const props = JSON.parse(statsSection.props['data-props']);
      expect(props.referralPointsTitle).toBe('Points from referrals');
      expect(props.totalReferralsTitle).toBe('Total referrals');
    });

    it('should pass balanceRefereePortion as earnedPointsFromReferees to ReferralStatsSection', () => {
      // Arrange
      setupSelectors({ selectBalanceRefereePortion: 3200 });

      // Act
      const { getByTestId } = render(<ReferralStatsSummary />);

      // Assert
      const statsSection = getByTestId('referral-stats-section');
      const props = JSON.parse(statsSection.props['data-props']);
      expect(props.earnedPointsFromReferees).toBe(3200);
    });

    it('should pass refereeCount to ReferralStatsSection', () => {
      // Arrange
      setupSelectors({ selectReferralCount: 10 });

      // Act
      const { getByTestId } = render(<ReferralStatsSummary />);

      // Assert
      const statsSection = getByTestId('referral-stats-section');
      const props = JSON.parse(statsSection.props['data-props']);
      expect(props.refereeCount).toBe(10);
    });

    it('should pass referralDetailsLoading to ReferralStatsSection loading props', () => {
      // Arrange
      setupSelectors({ selectReferralDetailsLoading: true });

      // Act
      const { getByTestId } = render(<ReferralStatsSummary />);

      // Assert
      const statsSection = getByTestId('referral-stats-section');
      const props = JSON.parse(statsSection.props['data-props']);
      expect(props.earnedPointsFromRefereesLoading).toBe(true);
      expect(props.refereeCountLoading).toBe(true);
    });

    it('should pass referralDetailsError to ReferralStatsSection refereeCountError', () => {
      // Arrange - error present but referralCode exists so stats section still renders
      setupSelectors({
        selectReferralDetailsError: true,
        selectReferralCode: 'REFER123',
      });

      // Act
      const { getByTestId } = render(<ReferralStatsSummary />);

      // Assert
      const statsSection = getByTestId('referral-stats-section');
      const props = JSON.parse(statsSection.props['data-props']);
      expect(props.refereeCountError).toBe(true);
    });
  });

  describe('season status error', () => {
    it('should show season status error banner when seasonStatusError is true and seasonStartDate is falsy', () => {
      // Arrange
      setupSelectors({
        selectSeasonStatusError: true,
        selectSeasonStartDate: null,
      });

      // Act
      const { getByTestId, queryByTestId } = render(<ReferralStatsSummary />);

      // Assert
      expect(getByTestId('rewards-error-banner')).toBeTruthy();
      expect(getByTestId('error-title').props.children).toBe(
        "Season balance couldn't be loaded",
      );
      expect(getByTestId('error-description').props.children).toBe(
        'Check your connection and try again.',
      );
      expect(queryByTestId('referral-stats-section')).toBeNull();
      expect(queryByTestId('error-retry-button')).toBeNull();
    });

    it('should NOT show season status error banner when seasonStartDate exists even if seasonStatusError is true', () => {
      // Arrange
      setupSelectors({
        selectSeasonStatusError: true,
        selectSeasonStartDate: '2024-01-01',
      });

      // Act
      const { queryByTestId, getByTestId } = render(<ReferralStatsSummary />);

      // Assert
      expect(queryByTestId('rewards-error-banner')).toBeNull();
      expect(getByTestId('referral-stats-section')).toBeTruthy();
    });

    it('should NOT show season status error banner when seasonStatusError is false', () => {
      // Arrange
      setupSelectors({
        selectSeasonStatusError: false,
        selectSeasonStartDate: null,
      });

      // Act
      const { queryByTestId, getByTestId } = render(<ReferralStatsSummary />);

      // Assert
      expect(queryByTestId('rewards-error-banner')).toBeNull();
      expect(getByTestId('referral-stats-section')).toBeTruthy();
    });
  });

  describe('referral details error', () => {
    it('should show referral details error banner when error occurs, not loading, and no referral code', () => {
      // Arrange
      setupSelectors({
        selectReferralDetailsError: true,
        selectReferralDetailsLoading: false,
        selectReferralCode: null,
        selectSeasonStatusError: false,
        selectSeasonStartDate: '2024-01-01',
      });

      // Act
      const { getByTestId, queryByTestId } = render(<ReferralStatsSummary />);

      // Assert
      expect(getByTestId('rewards-error-banner')).toBeTruthy();
      expect(getByTestId('error-title').props.children).toBe(
        "Referral details couldn't be loaded",
      );
      expect(getByTestId('error-description').props.children).toBe(
        'Check your connection and try again.',
      );
      expect(getByTestId('error-retry-button')).toBeTruthy();
      expect(queryByTestId('referral-stats-section')).toBeNull();
    });

    it('should show retry button with correct label', () => {
      // Arrange
      setupSelectors({
        selectReferralDetailsError: true,
        selectReferralDetailsLoading: false,
        selectReferralCode: null,
        selectSeasonStatusError: false,
      });

      // Act
      const { getByText } = render(<ReferralStatsSummary />);

      // Assert
      expect(getByText('Retry')).toBeTruthy();
    });

    it('should call fetchReferralDetails when retry button is pressed', () => {
      // Arrange
      setupSelectors({
        selectReferralDetailsError: true,
        selectReferralDetailsLoading: false,
        selectReferralCode: null,
        selectSeasonStatusError: false,
      });

      // Act
      const { getByTestId } = render(<ReferralStatsSummary />);
      fireEvent.press(getByTestId('error-retry-button'));

      // Assert
      expect(mockFetchReferralDetails).toHaveBeenCalledTimes(1);
    });

    it('should NOT show referral details error when still loading', () => {
      // Arrange
      setupSelectors({
        selectReferralDetailsError: true,
        selectReferralDetailsLoading: true,
        selectReferralCode: null,
        selectSeasonStatusError: false,
      });

      // Act
      const { queryByTestId, getByTestId } = render(<ReferralStatsSummary />);

      // Assert
      expect(queryByTestId('rewards-error-banner')).toBeNull();
      expect(getByTestId('referral-stats-section')).toBeTruthy();
    });

    it('should NOT show referral details error when referral code exists', () => {
      // Arrange
      setupSelectors({
        selectReferralDetailsError: true,
        selectReferralDetailsLoading: false,
        selectReferralCode: 'REFER123',
        selectSeasonStatusError: false,
      });

      // Act
      const { queryByTestId, getByTestId } = render(<ReferralStatsSummary />);

      // Assert
      expect(queryByTestId('rewards-error-banner')).toBeNull();
      expect(getByTestId('referral-stats-section')).toBeTruthy();
    });

    it('should NOT show referral details error when no error exists', () => {
      // Arrange
      setupSelectors({
        selectReferralDetailsError: false,
        selectReferralDetailsLoading: false,
        selectReferralCode: null,
        selectSeasonStatusError: false,
      });

      // Act
      const { queryByTestId, getByTestId } = render(<ReferralStatsSummary />);

      // Assert
      expect(queryByTestId('rewards-error-banner')).toBeNull();
      expect(getByTestId('referral-stats-section')).toBeTruthy();
    });
  });

  describe('error priority', () => {
    it('should prioritize season status error over referral details error', () => {
      // Arrange - both errors active, no season start date
      setupSelectors({
        selectSeasonStatusError: true,
        selectSeasonStartDate: null,
        selectReferralDetailsError: true,
        selectReferralDetailsLoading: false,
        selectReferralCode: null,
      });

      // Act
      const { getByTestId } = render(<ReferralStatsSummary />);

      // Assert - should show the season status error, not the referral details error
      expect(getByTestId('error-title').props.children).toBe(
        "Season balance couldn't be loaded",
      );
    });
  });

  describe('hooks integration', () => {
    it('should call useReferralDetails hook', () => {
      // Act
      render(<ReferralStatsSummary />);

      // Assert
      expect(mockUseReferralDetails).toHaveBeenCalled();
    });

    it('should call useSelector for all required selectors', () => {
      // Act
      render(<ReferralStatsSummary />);

      // Assert - component uses 7 useSelector calls
      expect(mockUseSelector).toHaveBeenCalledTimes(7);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined props gracefully', () => {
      // Act & Assert
      expect(() => render(<ReferralStatsSummary />)).not.toThrow();
    });

    it('should handle null selector values for referral count and balance', () => {
      // Arrange
      setupSelectors({
        selectReferralCount: null,
        selectBalanceRefereePortion: null,
      });

      // Act
      const { getByTestId } = render(<ReferralStatsSummary />);

      // Assert
      const statsSection = getByTestId('referral-stats-section');
      const props = JSON.parse(statsSection.props['data-props']);
      expect(props.earnedPointsFromReferees).toBeNull();
      expect(props.refereeCount).toBeNull();
    });

    it('should handle zero values for referral count and balance', () => {
      // Arrange
      setupSelectors({
        selectReferralCount: 0,
        selectBalanceRefereePortion: 0,
      });

      // Act
      const { getByTestId } = render(<ReferralStatsSummary />);

      // Assert
      const statsSection = getByTestId('referral-stats-section');
      const props = JSON.parse(statsSection.props['data-props']);
      expect(props.earnedPointsFromReferees).toBe(0);
      expect(props.refereeCount).toBe(0);
    });

    it('should handle empty string referral code as falsy for error condition', () => {
      // Arrange - empty string is falsy, so error banner should show
      setupSelectors({
        selectReferralDetailsError: true,
        selectReferralDetailsLoading: false,
        selectReferralCode: '',
        selectSeasonStatusError: false,
      });

      // Act
      const { getByTestId } = render(<ReferralStatsSummary />);

      // Assert
      expect(getByTestId('rewards-error-banner')).toBeTruthy();
      expect(getByTestId('error-title').props.children).toBe(
        "Referral details couldn't be loaded",
      );
    });

    it('should show ReferralStatsSection with loading states when referral code is absent but loading', () => {
      // Arrange
      setupSelectors({
        selectReferralDetailsLoading: true,
        selectReferralCode: null,
        selectSeasonStatusError: false,
      });

      // Act
      const { getByTestId } = render(<ReferralStatsSummary />);

      // Assert
      const statsSection = getByTestId('referral-stats-section');
      const props = JSON.parse(statsSection.props['data-props']);
      expect(props.earnedPointsFromRefereesLoading).toBe(true);
      expect(props.refereeCountLoading).toBe(true);
    });
  });
});
