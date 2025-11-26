import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import PreviousSeasonBalance from './PreviousSeasonBalance';
import {
  selectSeasonId,
  selectSeasonStatusLoading,
  selectSeasonStatusError,
  selectBalanceTotal,
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
  selectSeasonStatusLoading: jest.fn(),
  selectSeasonStatusError: jest.fn(),
  selectBalanceTotal: jest.fn(),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock format utils
jest.mock('../../utils/formatUtils', () => ({
  formatNumber: jest.fn((value: number | null) => {
    if (value === null || value === undefined) {
      return '0';
    }
    return value.toString();
  }),
}));

// Mock SVG component
jest.mock(
  '../../../../../images/rewards/metamask-rewards-points-alternative.svg',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.createElement(View, {
      testID: 'metamask-rewards-points-alternative-image',
    });
  },
);

// Mock PreviousSeasonSummaryTile
jest.mock('./PreviousSeasonSummaryTile', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return ReactActual.forwardRef(
    ({
      children,
      isLoading,
      testID,
    }: {
      children: React.ReactNode;
      isLoading?: boolean;
      testID?: string;
    }) => (
      <View testID={testID}>
        {isLoading ? <Text testID="loading-skeleton">Loading</Text> : children}
      </View>
    ),
  );
});

describe('PreviousSeasonBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return false;
      if (selector === selectBalanceTotal) return 1000;
      return undefined;
    });
  });

  it('returns null when seasonId is not present', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return null;
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return false;
      if (selector === selectBalanceTotal) return 1000;
      return undefined;
    });

    const { queryByTestId } = render(<PreviousSeasonBalance />);

    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_BALANCE),
    ).toBeNull();
  });

  it('returns null when seasonId is undefined', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return undefined;
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return false;
      if (selector === selectBalanceTotal) return 1000;
      return undefined;
    });

    const { queryByTestId } = render(<PreviousSeasonBalance />);

    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_BALANCE),
    ).toBeNull();
  });

  it('returns null when there is an error and not loading', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return null;
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return true;
      if (selector === selectBalanceTotal) return 1000;
      return undefined;
    });

    const { queryByTestId } = render(<PreviousSeasonBalance />);

    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_BALANCE),
    ).toBeNull();
  });

  it('renders component when seasonId is present', () => {
    const { getByTestId } = render(<PreviousSeasonBalance />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_BALANCE),
    ).toBeOnTheScreen();
  });

  it('shows loading state when loading and no seasonId', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return null;
      if (selector === selectSeasonStatusLoading) return true;
      if (selector === selectSeasonStatusError) return false;
      if (selector === selectBalanceTotal) return 1000;
      return undefined;
    });

    const { getByTestId } = render(<PreviousSeasonBalance />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_BALANCE),
    ).toBeOnTheScreen();
    expect(getByTestId('loading-skeleton')).toBeOnTheScreen();
  });

  it('does not show loading state when seasonId is present even if loading', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectSeasonStatusLoading) return true;
      if (selector === selectSeasonStatusError) return false;
      if (selector === selectBalanceTotal) return 1000;
      return undefined;
    });

    const { getByTestId, queryByTestId } = render(<PreviousSeasonBalance />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_BALANCE),
    ).toBeOnTheScreen();
    expect(queryByTestId('loading-skeleton')).toBeNull();
  });

  it('displays formatted balance', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return false;
      if (selector === selectBalanceTotal) return 5000;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonBalance />);

    expect(getByText('5000')).toBeOnTheScreen();
  });

  it('displays zero when balance is null', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return false;
      if (selector === selectBalanceTotal) return null;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonBalance />);

    expect(getByText('0')).toBeOnTheScreen();
  });

  it('displays zero when balance is undefined', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return false;
      if (selector === selectBalanceTotal) return undefined;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonBalance />);

    expect(getByText('0')).toBeOnTheScreen();
  });

  it('shows plural text when balance is greater than 1', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return false;
      if (selector === selectBalanceTotal) return 5;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonBalance />);

    expect(
      getByText('rewards.previous_season_summary.points_earned'),
    ).toBeOnTheScreen();
  });

  it('shows plural text when balance is 0', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return false;
      if (selector === selectBalanceTotal) return 0;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonBalance />);

    expect(
      getByText('rewards.previous_season_summary.points_earned'),
    ).toBeOnTheScreen();
  });

  it('shows singular text when balance is exactly 1', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonId) return 'season-1';
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return false;
      if (selector === selectBalanceTotal) return 1;
      return undefined;
    });

    const { getByText } = render(<PreviousSeasonBalance />);

    expect(
      getByText('rewards.previous_season_summary.point_earned'),
    ).toBeOnTheScreen();
  });

  it('renders the rewards points image', () => {
    const { getByTestId } = render(<PreviousSeasonBalance />);

    expect(
      getByTestId('metamask-rewards-points-alternative-image'),
    ).toBeOnTheScreen();
  });

  it('uses correct testID', () => {
    const { getByTestId } = render(<PreviousSeasonBalance />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_BALANCE),
    ).toBeOnTheScreen();
  });
});
