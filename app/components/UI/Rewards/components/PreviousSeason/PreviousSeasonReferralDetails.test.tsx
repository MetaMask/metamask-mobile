import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import PreviousSeasonReferralDetails from './PreviousSeasonReferralDetails';
import {
  selectSeasonId,
  selectReferralCount,
  selectBalanceRefereePortion,
  selectReferralDetailsLoading,
  selectReferralDetailsError,
} from '../../../../../reducers/rewards/selectors';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock selectors
jest.mock('../../../../../reducers/rewards/selectors', () => ({
  selectSeasonId: jest.fn(),
  selectReferralCount: jest.fn(),
  selectBalanceRefereePortion: jest.fn(),
  selectReferralDetailsLoading: jest.fn(),
  selectReferralDetailsError: jest.fn(),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock useReferralDetails hook
const mockFetchReferralDetails = jest.fn();
jest.mock('../../hooks/useReferralDetails', () => ({
  useReferralDetails: jest.fn(() => ({
    fetchReferralDetails: mockFetchReferralDetails,
  })),
}));

// Mock Tailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const mockTw = jest.fn(() => ({}));
    Object.assign(mockTw, {
      style: jest.fn((styles) => {
        if (Array.isArray(styles)) {
          return styles.reduce((acc, style) => ({ ...acc, ...style }), {});
        }
        return styles || {};
      }),
    });
    return mockTw;
  },
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  const Box = ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => ReactActual.createElement(View, props, children);

  const TextComponent = ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => ReactActual.createElement(Text, props, children);

  return {
    Box,
    Text: TextComponent,
    BoxFlexDirection: {
      Row: 'row',
      Column: 'column',
    },
    TextVariant: {
      BodyLg: 'BodyLg',
      BodyMd: 'BodyMd',
    },
    FontWeight: {
      Bold: 'bold',
      Medium: 'medium',
    },
  };
});

// Mock PreviousSeasonSummaryTile
jest.mock('./PreviousSeasonSummaryTile', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  const PreviousSeasonSummaryTile = ({
    children,
    isLoading,
    testID,
  }: {
    children: React.ReactNode;
    isLoading?: boolean;
    testID?: string;
  }) =>
    ReactActual.createElement(
      View,
      { testID },
      isLoading
        ? ReactActual.createElement(
            Text,
            { testID: 'loading-skeleton' },
            'Loading',
          )
        : children,
    );

  return PreviousSeasonSummaryTile;
});

// Mock RewardsErrorBanner
jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');

  const RewardsErrorBanner = ({
    title,
    description,
    onConfirm,
    confirmButtonLabel,
    testID,
  }: {
    title: string;
    description: string;
    onConfirm?: () => void;
    confirmButtonLabel?: string;
    testID?: string;
  }) =>
    ReactActual.createElement(
      View,
      { testID },
      ReactActual.createElement(Text, null, title),
      ReactActual.createElement(Text, null, description),
      onConfirm &&
        ReactActual.createElement(
          Pressable,
          { onPress: onConfirm, testID: 'error-banner-confirm-button' },
          ReactActual.createElement(
            Text,
            null,
            confirmButtonLabel || 'Confirm',
          ),
        ),
    );

  return RewardsErrorBanner;
});

describe('PreviousSeasonReferralDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchReferralDetails.mockClear();

    // Default mock implementation
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectReferralCount) return 5;
      if (selector === selectBalanceRefereePortion) return 1000;
      if (selector === selectReferralDetailsLoading) return false;
      if (selector === selectReferralDetailsError) return false;
      return undefined;
    });
  });

  it('returns null when seasonId is not present', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return null;
      if (selector === selectReferralCount) return 5;
      if (selector === selectBalanceRefereePortion) return 1000;
      if (selector === selectReferralDetailsLoading) return false;
      if (selector === selectReferralDetailsError) return false;
      return undefined;
    });

    const { queryByTestId } = render(<PreviousSeasonReferralDetails />);

    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_REFERRAL_DETAILS),
    ).toBeNull();
  });

  it('returns null when seasonId is undefined', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return undefined;
      if (selector === selectReferralCount) return 5;
      if (selector === selectBalanceRefereePortion) return 1000;
      if (selector === selectReferralDetailsLoading) return false;
      if (selector === selectReferralDetailsError) return false;
      return undefined;
    });

    const { queryByTestId } = render(<PreviousSeasonReferralDetails />);

    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_REFERRAL_DETAILS),
    ).toBeNull();
  });

  it('renders error banner when there is an error, not loading, and no totalReferees', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectReferralCount) return 0;
      if (selector === selectBalanceRefereePortion) return 0;
      if (selector === selectReferralDetailsLoading) return false;
      if (selector === selectReferralDetailsError) return true;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonReferralDetails />);

    expect(
      getByText('rewards.referral_details_error.error_fetching_title'),
    ).toBeOnTheScreen();
    expect(
      getByText('rewards.referral_details_error.error_fetching_description'),
    ).toBeOnTheScreen();
    expect(
      getByText('rewards.referral_details_error.retry_button'),
    ).toBeOnTheScreen();
  });

  it('does not render error banner when there is an error but loading is true', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectReferralCount) return 0;
      if (selector === selectBalanceRefereePortion) return 0;
      if (selector === selectReferralDetailsLoading) return true;
      if (selector === selectReferralDetailsError) return true;
      return undefined;
    });

    const { queryByText } = render(<PreviousSeasonReferralDetails />);

    expect(
      queryByText('rewards.referral_details_error.error_fetching_title'),
    ).toBeNull();
  });

  it('does not render error banner when there is an error but totalReferees exists', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectReferralCount) return 5;
      if (selector === selectBalanceRefereePortion) return 1000;
      if (selector === selectReferralDetailsLoading) return false;
      if (selector === selectReferralDetailsError) return true;
      return undefined;
    });

    const { queryByText, getByText } = render(
      <PreviousSeasonReferralDetails />,
    );

    expect(
      queryByText('rewards.referral_details_error.error_fetching_title'),
    ).toBeNull();
    expect(getByText('5')).toBeOnTheScreen();
  });

  it('calls fetchReferralDetails when retry button is pressed', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectReferralCount) return 0;
      if (selector === selectBalanceRefereePortion) return 0;
      if (selector === selectReferralDetailsLoading) return false;
      if (selector === selectReferralDetailsError) return true;
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonReferralDetails />);

    const retryButton = getByTestId('error-banner-confirm-button');
    fireEvent.press(retryButton);

    expect(mockFetchReferralDetails).toHaveBeenCalledTimes(1);
  });

  it('renders component with referral details when seasonId is present', () => {
    const { getByText } = render(<PreviousSeasonReferralDetails />);

    expect(getByText('5')).toBeOnTheScreen();
    expect(getByText('1000')).toBeOnTheScreen();
  });

  it('displays total referees count', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectReferralCount) return 10;
      if (selector === selectBalanceRefereePortion) return 2000;
      if (selector === selectReferralDetailsLoading) return false;
      if (selector === selectReferralDetailsError) return false;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonReferralDetails />);

    expect(getByText('10')).toBeOnTheScreen();
  });

  it('displays referral points', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectReferralCount) return 3;
      if (selector === selectBalanceRefereePortion) return 500;
      if (selector === selectReferralDetailsLoading) return false;
      if (selector === selectReferralDetailsError) return false;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonReferralDetails />);

    expect(getByText('500')).toBeOnTheScreen();
  });

  it('displays referral count label', () => {
    const { getByText } = render(<PreviousSeasonReferralDetails />);

    expect(getByText('rewards.referral_stats_referrals')).toBeOnTheScreen();
  });

  it('displays referral points label', () => {
    const { getByText } = render(<PreviousSeasonReferralDetails />);

    expect(
      getByText('rewards.referral_stats_earned_from_referrals'),
    ).toBeOnTheScreen();
  });

  it('shows loading state when referralDetailsLoading is true', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectReferralCount) return 5;
      if (selector === selectBalanceRefereePortion) return 1000;
      if (selector === selectReferralDetailsLoading) return true;
      if (selector === selectReferralDetailsError) return false;
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonReferralDetails />);

    expect(getByTestId('loading-skeleton')).toBeOnTheScreen();
  });

  it('does not show loading state when referralDetailsLoading is false', () => {
    const { queryByTestId, getByText } = render(
      <PreviousSeasonReferralDetails />,
    );

    expect(queryByTestId('loading-skeleton')).toBeNull();
    expect(getByText('5')).toBeOnTheScreen();
  });

  it('handles null total referees', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectReferralCount) return null;
      if (selector === selectBalanceRefereePortion) return null;
      if (selector === selectReferralDetailsLoading) return false;
      if (selector === selectReferralDetailsError) return false;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonReferralDetails />);

    // Component should still render with labels visible
    expect(getByText('rewards.referral_stats_referrals')).toBeOnTheScreen();
    expect(
      getByText('rewards.referral_stats_earned_from_referrals'),
    ).toBeOnTheScreen();
  });

  it('handles undefined total referees', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectReferralCount) return undefined;
      if (selector === selectBalanceRefereePortion) return undefined;
      if (selector === selectReferralDetailsLoading) return false;
      if (selector === selectReferralDetailsError) return false;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonReferralDetails />);

    // Component should still render with labels visible
    expect(getByText('rewards.referral_stats_referrals')).toBeOnTheScreen();
    expect(
      getByText('rewards.referral_stats_earned_from_referrals'),
    ).toBeOnTheScreen();
  });

  it('handles large referral counts', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectReferralCount) return 999999;
      if (selector === selectBalanceRefereePortion) return 5000000;
      if (selector === selectReferralDetailsLoading) return false;
      if (selector === selectReferralDetailsError) return false;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonReferralDetails />);

    expect(getByText('999999')).toBeOnTheScreen();
    expect(getByText('5000000')).toBeOnTheScreen();
  });

  it('renders correctly with all valid data', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-123';
      if (selector === selectReferralCount) return 42;
      if (selector === selectBalanceRefereePortion) return 12345;
      if (selector === selectReferralDetailsLoading) return false;
      if (selector === selectReferralDetailsError) return false;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonReferralDetails />);

    expect(getByText('42')).toBeOnTheScreen();
    expect(getByText('12345')).toBeOnTheScreen();
    expect(getByText('rewards.referral_stats_referrals')).toBeOnTheScreen();
    expect(
      getByText('rewards.referral_stats_earned_from_referrals'),
    ).toBeOnTheScreen();
  });
});
