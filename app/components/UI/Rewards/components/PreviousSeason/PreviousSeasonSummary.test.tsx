import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import PreviousSeasonSummary from './PreviousSeasonSummary';
import {
  selectSeasonName,
  selectSeasonStatusError,
  selectSeasonStatusLoading,
} from '../../../../../reducers/rewards/selectors';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock selectors
jest.mock('../../../../../reducers/rewards/selectors', () => ({
  selectSeasonName: jest.fn(),
  selectSeasonStatusError: jest.fn(),
  selectSeasonStatusLoading: jest.fn(),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'rewards.previous_season_summary.title': 'Previous Season: {seasonName}',
      'rewards.season_error.error_fetching_title': 'Error Fetching Season',
      'rewards.season_error.error_fetching_description':
        'Unable to load season data. Please try again.',
      'rewards.season_error.retry_button': 'Retry',
    };
    let result = translations[key] || key;
    if (params) {
      Object.keys(params).forEach((paramKey) => {
        result = result.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }
    return result;
  }),
}));

// Mock useSeasonStatus hook
const mockFetchSeasonStatus = jest.fn();
jest.mock('../../hooks/useSeasonStatus', () => ({
  useSeasonStatus: jest.fn(() => ({
    fetchSeasonStatus: mockFetchSeasonStatus,
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
    TextVariant: {
      HeadingMd: 'HeadingMd',
      BodyMd: 'BodyMd',
    },
    FontWeight: {
      Bold: 'bold',
      Medium: 'medium',
    },
  };
});

// Mock child components
jest.mock('./PreviousSeasonBalance', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  const PreviousSeasonBalance = () =>
    ReactActual.createElement(
      View,
      { testID: 'previous-season-balance' },
      ReactActual.createElement(Text, null, 'Balance'),
    );
  return PreviousSeasonBalance;
});

jest.mock('./PreviousSeasonLevel', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  const PreviousSeasonLevel = () =>
    ReactActual.createElement(
      View,
      { testID: 'previous-season-level' },
      ReactActual.createElement(Text, null, 'Level'),
    );
  return PreviousSeasonLevel;
});

jest.mock('./PreviousSeasonReferralDetails', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  const PreviousSeasonReferralDetails = () =>
    ReactActual.createElement(
      View,
      { testID: 'previous-season-referral-details' },
      ReactActual.createElement(Text, null, 'Referral Details'),
    );
  return PreviousSeasonReferralDetails;
});

jest.mock('./PreviousSeasonUnlockedRewards', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  const PreviousSeasonUnlockedRewards = () =>
    ReactActual.createElement(
      View,
      { testID: 'previous-season-unlocked-rewards' },
      ReactActual.createElement(Text, null, 'Unlocked Rewards'),
    );
  return PreviousSeasonUnlockedRewards;
});

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
      ReactActual.createElement(Text, { testID: 'error-title' }, title),
      ReactActual.createElement(
        Text,
        { testID: 'error-description' },
        description,
      ),
      onConfirm &&
        ReactActual.createElement(
          Pressable,
          { onPress: onConfirm, testID: 'error-retry-button' },
          ReactActual.createElement(
            Text,
            null,
            confirmButtonLabel || 'Confirm',
          ),
        ),
    );
  return RewardsErrorBanner;
});

describe('PreviousSeasonSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchSeasonStatus.mockClear();

    // Default mock implementation
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonName) return 'Season 1';
      if (selector === selectSeasonStatusError) return false;
      if (selector === selectSeasonStatusLoading) return false;
      return undefined;
    });
  });

  describe('useSelector calls', () => {
    it('calls selectSeasonName selector', () => {
      render(<PreviousSeasonSummary />);

      expect(mockUseSelector).toHaveBeenCalledWith(selectSeasonName);
    });

    it('calls selectSeasonStatusError selector', () => {
      render(<PreviousSeasonSummary />);

      expect(mockUseSelector).toHaveBeenCalledWith(selectSeasonStatusError);
    });

    it('calls selectSeasonStatusLoading selector', () => {
      render(<PreviousSeasonSummary />);

      expect(mockUseSelector).toHaveBeenCalledWith(selectSeasonStatusLoading);
    });

    it('calls all three selectors', () => {
      render(<PreviousSeasonSummary />);

      expect(mockUseSelector).toHaveBeenCalledWith(selectSeasonName);
      expect(mockUseSelector).toHaveBeenCalledWith(selectSeasonStatusError);
      expect(mockUseSelector).toHaveBeenCalledWith(selectSeasonStatusLoading);
    });
  });

  describe('seasonName usage', () => {
    it('displays season name in title when seasonName is provided', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonName) return 'Summer 2024';
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStatusLoading) return false;
        return undefined;
      });

      const { getByText } = render(<PreviousSeasonSummary />);

      expect(getByText('Previous Season: Summer 2024')).toBeOnTheScreen();
    });

    it('displays empty string in title when seasonName is null', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonName) return null;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStatusLoading) return false;
        return undefined;
      });

      const { getByText } = render(<PreviousSeasonSummary />);

      expect(getByText('Previous Season: ')).toBeOnTheScreen();
    });

    it('displays empty string in title when seasonName is undefined', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonName) return undefined;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStatusLoading) return false;
        return undefined;
      });

      const { getByText } = render(<PreviousSeasonSummary />);

      expect(getByText('Previous Season: ')).toBeOnTheScreen();
    });
  });

  describe('error state', () => {
    it('does not render error banner when seasonError is true but loading is true', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonName) return 'Season 1';
        if (selector === selectSeasonStatusError) return true;
        if (selector === selectSeasonStatusLoading) return true;
        return undefined;
      });

      const { queryByTestId } = render(<PreviousSeasonSummary />);

      expect(queryByTestId('rewards-error-banner')).toBeNull();
    });

    it('does not render error banner when seasonError is false', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonName) return 'Season 1';
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStatusLoading) return false;
        return undefined;
      });

      const { queryByTestId } = render(<PreviousSeasonSummary />);

      expect(queryByTestId('rewards-error-banner')).toBeNull();
    });

    it('calls fetchSeasonStatus when retry button is pressed', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonName) return 'Season 1';
        if (selector === selectSeasonStatusError) return true;
        if (selector === selectSeasonStatusLoading) return false;
        return undefined;
      });

      const { getByTestId } = render(<PreviousSeasonSummary />);

      const retryButton = getByTestId('error-retry-button');
      fireEvent.press(retryButton);

      expect(mockFetchSeasonStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('normal state', () => {
    it('renders child components when there is no error and not loading', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonName) return 'Season 1';
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStatusLoading) return false;
        return undefined;
      });

      const { getByTestId } = render(<PreviousSeasonSummary />);

      expect(getByTestId('previous-season-balance')).toBeOnTheScreen();
      expect(getByTestId('previous-season-level')).toBeOnTheScreen();
      expect(getByTestId('previous-season-referral-details')).toBeOnTheScreen();
      expect(getByTestId('previous-season-unlocked-rewards')).toBeOnTheScreen();
    });

    it('renders component with correct testID', () => {
      const { getByTestId } = render(<PreviousSeasonSummary />);

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_SUMMARY),
      ).toBeOnTheScreen();
    });
  });
});
