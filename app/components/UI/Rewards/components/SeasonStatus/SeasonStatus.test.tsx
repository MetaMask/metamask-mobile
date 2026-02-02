import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import SeasonStatusSummary from './SeasonStatus';
import {
  selectSeasonStatusLoading,
  selectBalanceTotal,
  selectSeasonEndDate,
  selectSeasonName,
  selectSeasonStatusError,
  selectSeasonStartDate,
} from '../../../../../reducers/rewards/selectors';
import { formatNumber, formatTimeRemaining } from '../../utils/formatUtils';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock selectors
jest.mock('../../../../../reducers/rewards/selectors', () => ({
  selectSeasonStatusLoading: jest.fn(),
  selectBalanceTotal: jest.fn(),
  selectSeasonEndDate: jest.fn(),
  selectSeasonName: jest.fn(),
  selectSeasonStatusError: jest.fn(),
  selectSeasonStartDate: jest.fn(),
}));

// Mock formatUtils
jest.mock('../../utils/formatUtils', () => ({
  formatNumber: jest.fn((value: number | null) =>
    value === null || value === undefined ? '0' : value.toLocaleString(),
  ),
  formatTimeRemaining: jest.fn((endDate: Date) => {
    const now = new Date('2024-06-15T12:00:00.000Z');
    const diff = endDate.getTime() - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${minutes}m`;
  }),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.previous_season_summary.points_earned': 'Points earned',
      'rewards.season_status_error.error_fetching_title':
        "Season balance couldn't be loaded",
      'rewards.season_status_error.error_fetching_description':
        'Check your connection and try again.',
      'rewards.season_status_error.retry_button': 'Retry',
    };
    return translations[key] || key;
  }),
}));

// Mock useSeasonStatus hook
const mockFetchSeasonStatus = jest.fn();
jest.mock('../../hooks/useSeasonStatus', () => ({
  useSeasonStatus: () => ({
    fetchSeasonStatus: mockFetchSeasonStatus,
  }),
}));

// Mock useTheme
jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: {
        alternative: '#f5f5f5',
        default: '#ffffff',
        section: '#f9f9f9',
      },
      text: {
        primary: '#000000',
        alternative: '#666666',
      },
    },
  })),
}));

// Mock Tailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const mockTw = jest.fn(() => ({}));
    Object.assign(mockTw, {
      style: jest.fn((styles) => {
        if (typeof styles === 'object') {
          return styles;
        }
        if (Array.isArray(styles)) {
          return styles.reduce(
            (acc, style) => ({ ...acc, ...style }),
            {} as Record<string, unknown>,
          );
        }
        return {};
      }),
    });
    return mockTw;
  },
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText } = jest.requireActual('react-native');

  const Box = ({
    children,
    testID,
    style,
    ...props
  }: {
    children?: React.ReactNode;
    testID?: string;
    style?: Record<string, unknown>;
    [key: string]: unknown;
  }) => ReactActual.createElement(View, { testID, style, ...props }, children);

  const TextComponent = ({
    children,
    testID,
    ...props
  }: {
    children?: React.ReactNode;
    testID?: string;
    [key: string]: unknown;
  }) => ReactActual.createElement(RNText, { testID, ...props }, children);

  return {
    Box,
    Text: TextComponent,
    TextVariant: {
      HeadingMd: 'HeadingMd',
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
    },
    FontWeight: {
      Bold: 'bold',
      Medium: 'medium',
    },
    BoxFlexDirection: {
      Row: 'row',
      Column: 'column',
    },
    BoxAlignItems: {
      Center: 'center',
      FlexEnd: 'flex-end',
    },
    BoxJustifyContent: {
      SpaceBetween: 'space-between',
    },
  };
});

// Mock SVG image
jest.mock('../../../../../images/rewards/metamask-rewards-points.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockSvg(props: Record<string, unknown>) {
    return ReactActual.createElement(View, {
      testID: 'metamask-rewards-points-image',
      ...props,
    });
  };
});

// Mock Skeleton component
jest.mock('../../../../../component-library/components/Skeleton', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    Skeleton: ({ height, width }: { height: number; width: string }) =>
      ReactActual.createElement(View, {
        testID: 'skeleton-loader',
        style: { height, width },
      }),
  };
});

// Mock RewardsErrorBanner
jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText, Pressable } = jest.requireActual('react-native');
  const RewardsErrorBanner = ({
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
      ReactActual.createElement(RNText, { testID: 'error-title' }, title),
      ReactActual.createElement(
        RNText,
        { testID: 'error-description' },
        description,
      ),
      onConfirm &&
        ReactActual.createElement(
          Pressable,
          { onPress: onConfirm, testID: 'error-retry-button' },
          ReactActual.createElement(
            RNText,
            null,
            confirmButtonLabel || 'Confirm',
          ),
        ),
    );
  return RewardsErrorBanner;
});

describe('SeasonStatusSummary', () => {
  const mockFormatNumber = formatNumber as jest.MockedFunction<
    typeof formatNumber
  >;
  const mockFormatTimeRemaining = formatTimeRemaining as jest.MockedFunction<
    typeof formatTimeRemaining
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchSeasonStatus.mockClear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));

    // Default mock implementation
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSeasonStatusLoading) return false;
      if (selector === selectSeasonStatusError) return false;
      if (selector === selectSeasonStartDate) return '2024-01-01';
      if (selector === selectSeasonEndDate) return '2024-12-31';
      if (selector === selectSeasonName) return 'Season 1';
      if (selector === selectBalanceTotal) return 1500;
      return undefined;
    });

    // Reset format mocks
    mockFormatNumber.mockImplementation((value: number | null) =>
      value === null || value === undefined ? '0' : value.toLocaleString(),
    );
    mockFormatTimeRemaining.mockImplementation(() => '10d 5h 30m');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  describe('useSelector calls', () => {
    it('calls selectSeasonStatusLoading selector', () => {
      render(<SeasonStatusSummary />);

      expect(mockUseSelector).toHaveBeenCalledWith(selectSeasonStatusLoading);
    });

    it('calls selectSeasonStatusError selector', () => {
      render(<SeasonStatusSummary />);

      expect(mockUseSelector).toHaveBeenCalledWith(selectSeasonStatusError);
    });

    it('calls selectSeasonStartDate selector', () => {
      render(<SeasonStatusSummary />);

      expect(mockUseSelector).toHaveBeenCalledWith(selectSeasonStartDate);
    });

    it('calls selectSeasonEndDate selector', () => {
      render(<SeasonStatusSummary />);

      expect(mockUseSelector).toHaveBeenCalledWith(selectSeasonEndDate);
    });

    it('calls selectSeasonName selector', () => {
      render(<SeasonStatusSummary />);

      expect(mockUseSelector).toHaveBeenCalledWith(selectSeasonName);
    });

    it('calls selectBalanceTotal selector', () => {
      render(<SeasonStatusSummary />);

      expect(mockUseSelector).toHaveBeenCalledWith(selectBalanceTotal);
    });
  });

  describe('loading state', () => {
    it('renders skeleton loader when loading', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonStatusLoading) return true;
        return undefined;
      });

      const { getByTestId } = render(<SeasonStatusSummary />);

      expect(getByTestId('skeleton-loader')).toBeOnTheScreen();
    });

    it('does not render points image when loading', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonStatusLoading) return true;
        return undefined;
      });

      const { queryByTestId } = render(<SeasonStatusSummary />);

      expect(queryByTestId('metamask-rewards-points-image')).toBeNull();
    });

    it('does not render season name when loading', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonStatusLoading) return true;
        if (selector === selectSeasonName) return 'Season 1';
        return undefined;
      });

      const { queryByText } = render(<SeasonStatusSummary />);

      expect(queryByText('Season 1')).toBeNull();
    });
  });

  describe('error state', () => {
    it('renders error banner when error exists and no season start date', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return true;
        if (selector === selectSeasonStartDate) return null;
        return undefined;
      });

      const { getByTestId } = render(<SeasonStatusSummary />);

      expect(getByTestId('rewards-error-banner')).toBeOnTheScreen();
    });

    it('renders error title in error banner', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return true;
        if (selector === selectSeasonStartDate) return null;
        return undefined;
      });

      const { getByTestId } = render(<SeasonStatusSummary />);

      expect(getByTestId('error-title')).toBeOnTheScreen();
    });

    it('renders error description in error banner', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return true;
        if (selector === selectSeasonStartDate) return null;
        return undefined;
      });

      const { getByTestId } = render(<SeasonStatusSummary />);

      expect(getByTestId('error-description')).toBeOnTheScreen();
    });

    it('renders retry button in error banner', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return true;
        if (selector === selectSeasonStartDate) return null;
        return undefined;
      });

      const { getByTestId } = render(<SeasonStatusSummary />);

      expect(getByTestId('error-retry-button')).toBeOnTheScreen();
    });

    it('calls fetchSeasonStatus when retry button is pressed', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return true;
        if (selector === selectSeasonStartDate) return null;
        return undefined;
      });

      const { getByTestId } = render(<SeasonStatusSummary />);

      const retryButton = getByTestId('error-retry-button');
      fireEvent.press(retryButton);

      expect(mockFetchSeasonStatus).toHaveBeenCalledTimes(1);
    });

    it('does not render error banner when error exists but season start date is present', () => {
      // When there's an error but we have cached data (seasonStartDate exists),
      // component should render the normal state
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return true;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonEndDate) return '2024-12-31';
        if (selector === selectSeasonName) return 'Season 1';
        if (selector === selectBalanceTotal) return 1500;
        return undefined;
      });

      const { getByTestId, queryByTestId } = render(<SeasonStatusSummary />);

      // Normal state renders the points image instead of error banner
      expect(getByTestId('metamask-rewards-points-image')).toBeOnTheScreen();
      expect(queryByTestId('rewards-error-banner')).toBeNull();
    });

    it('renders normal content when there is no error', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonEndDate) return '2024-12-31';
        if (selector === selectSeasonName) return 'Season 1';
        if (selector === selectBalanceTotal) return 1500;
        return undefined;
      });

      const { getByTestId } = render(<SeasonStatusSummary />);

      expect(getByTestId('metamask-rewards-points-image')).toBeOnTheScreen();
    });

    it('does not render points image when error state shows', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return true;
        if (selector === selectSeasonStartDate) return null;
        return undefined;
      });

      const { queryByTestId } = render(<SeasonStatusSummary />);

      expect(queryByTestId('metamask-rewards-points-image')).toBeNull();
    });
  });

  describe('normal state - points display', () => {
    it('renders points image', () => {
      const { getByTestId } = render(<SeasonStatusSummary />);

      expect(getByTestId('metamask-rewards-points-image')).toBeOnTheScreen();
    });

    it('displays formatted balance total', () => {
      mockFormatNumber.mockReturnValue('1,500');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectBalanceTotal) return 1500;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonEndDate) return '2024-12-31';
        if (selector === selectSeasonName) return 'Season 1';
        return undefined;
      });

      const { getByText } = render(<SeasonStatusSummary />);

      expect(getByText('1,500')).toBeOnTheScreen();
    });

    it('calls formatNumber with balance total', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectBalanceTotal) return 2500;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonEndDate) return '2024-12-31';
        if (selector === selectSeasonName) return 'Season 1';
        return undefined;
      });

      render(<SeasonStatusSummary />);

      expect(mockFormatNumber).toHaveBeenCalledWith(2500);
    });

    it('renders points section with balance total and season info', () => {
      // The points section contains balance total and points label
      // We verify the structure renders correctly
      const { getByText } = render(<SeasonStatusSummary />);

      // Balance total is visible
      expect(getByText('1,500')).toBeOnTheScreen();

      // Season info is visible
      expect(getByText('Season 1')).toBeOnTheScreen();

      // Time remaining is shown
      expect(getByText('10d 5h 30m')).toBeOnTheScreen();
    });
  });

  describe('normal state - season info display', () => {
    it('displays season name when provided', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonName) return 'Summer Season';
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonEndDate) return '2024-12-31';
        if (selector === selectBalanceTotal) return 1500;
        return undefined;
      });

      const { getByText } = render(<SeasonStatusSummary />);

      expect(getByText('Summer Season')).toBeOnTheScreen();
    });

    it('does not display season name when null', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonName) return null;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonEndDate) return '2024-12-31';
        if (selector === selectBalanceTotal) return 1500;
        return undefined;
      });

      const { queryByText } = render(<SeasonStatusSummary />);

      expect(queryByText('Summer Season')).toBeNull();
    });

    it('does not display season name text when value is empty string', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonName) return '';
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonEndDate) return '2024-12-31';
        if (selector === selectBalanceTotal) return 1500;
        return undefined;
      });

      const { queryByText } = render(<SeasonStatusSummary />);

      // Season 1 should not appear since it's set to empty string
      expect(queryByText('Season 1')).toBeNull();
    });

    it('displays time remaining when season end date is provided', () => {
      mockFormatTimeRemaining.mockReturnValue('15d 8h 22m');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonEndDate) return '2024-07-01';
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonName) return 'Season 1';
        if (selector === selectBalanceTotal) return 1500;
        return undefined;
      });

      const { getByText } = render(<SeasonStatusSummary />);

      expect(getByText('15d 8h 22m')).toBeOnTheScreen();
    });

    it('does not display time remaining when season end date is null', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonEndDate) return null;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonName) return 'Season 1';
        if (selector === selectBalanceTotal) return 1500;
        return undefined;
      });

      const { queryByText } = render(<SeasonStatusSummary />);

      expect(queryByText(/d.*h.*m/)).toBeNull();
    });

    it('does not display time remaining when formatTimeRemaining returns null', () => {
      mockFormatTimeRemaining.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonEndDate) return '2024-01-01';
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonName) return 'Season 1';
        if (selector === selectBalanceTotal) return 1500;
        return undefined;
      });

      const { queryByText } = render(<SeasonStatusSummary />);

      expect(queryByText(/d.*h.*m/)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('renders with zero balance', () => {
      mockFormatNumber.mockReturnValue('0');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectBalanceTotal) return 0;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonEndDate) return '2024-12-31';
        if (selector === selectSeasonName) return 'Season 1';
        return undefined;
      });

      const { getByText } = render(<SeasonStatusSummary />);

      expect(getByText('0')).toBeOnTheScreen();
    });

    it('renders with null balance', () => {
      mockFormatNumber.mockReturnValue('0');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectBalanceTotal) return null;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonEndDate) return '2024-12-31';
        if (selector === selectSeasonName) return 'Season 1';
        return undefined;
      });

      const { getByText } = render(<SeasonStatusSummary />);

      expect(mockFormatNumber).toHaveBeenCalledWith(null);
      expect(getByText('0')).toBeOnTheScreen();
    });

    it('renders with large balance', () => {
      mockFormatNumber.mockReturnValue('1,000,000');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectBalanceTotal) return 1000000;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonEndDate) return '2024-12-31';
        if (selector === selectSeasonName) return 'Season 1';
        return undefined;
      });

      const { getByText } = render(<SeasonStatusSummary />);

      expect(getByText('1,000,000')).toBeOnTheScreen();
    });

    it('renders correctly when only loading state changes', () => {
      // First render with loading
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonStatusLoading) return true;
        return undefined;
      });

      const { rerender, getByTestId, queryByTestId } = render(
        <SeasonStatusSummary />,
      );

      expect(getByTestId('skeleton-loader')).toBeOnTheScreen();

      // Then update to not loading
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonEndDate) return '2024-12-31';
        if (selector === selectSeasonName) return 'Season 1';
        if (selector === selectBalanceTotal) return 1500;
        return undefined;
      });
      mockFormatNumber.mockReturnValue('1,500');
      mockFormatTimeRemaining.mockReturnValue('10d 5h 30m');

      rerender(<SeasonStatusSummary />);

      expect(queryByTestId('skeleton-loader')).toBeNull();
      expect(getByTestId('metamask-rewards-points-image')).toBeOnTheScreen();
    });
  });

  describe('timeRemaining calculation', () => {
    it('calls formatTimeRemaining with Date object from season end date string', () => {
      const endDateString = '2024-12-31T23:59:59.000Z';
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonEndDate) return endDateString;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonName) return 'Season 1';
        if (selector === selectBalanceTotal) return 1500;
        return undefined;
      });

      render(<SeasonStatusSummary />);

      expect(mockFormatTimeRemaining).toHaveBeenCalledWith(
        new Date(endDateString),
      );
    });

    it('does not call formatTimeRemaining when season end date is null', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonEndDate) return null;
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonName) return 'Season 1';
        if (selector === selectBalanceTotal) return 1500;
        return undefined;
      });

      render(<SeasonStatusSummary />);

      expect(mockFormatTimeRemaining).not.toHaveBeenCalled();
    });
  });

  describe('component rendering without crashing', () => {
    it('renders without crashing with minimal props', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonEndDate) return null;
        if (selector === selectSeasonName) return null;
        if (selector === selectBalanceTotal) return null;
        return undefined;
      });

      expect(() => render(<SeasonStatusSummary />)).not.toThrow();
    });

    it('renders without crashing with all values present', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSeasonStatusLoading) return false;
        if (selector === selectSeasonStatusError) return false;
        if (selector === selectSeasonStartDate) return '2024-01-01';
        if (selector === selectSeasonEndDate) return '2024-12-31';
        if (selector === selectSeasonName) return 'Season 1';
        if (selector === selectBalanceTotal) return 5000;
        return undefined;
      });

      expect(() => render(<SeasonStatusSummary />)).not.toThrow();
    });
  });
});
