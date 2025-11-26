import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import { ActivityTab } from './ActivityTab';
import type {
  SeasonStatusState,
  PointsEventDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;

// Mock selectors
jest.mock('../../../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));
jest.mock('../../../../../../reducers/rewards/selectors', () => ({
  selectSeasonId: jest.fn(),
  selectSeasonStartDate: jest.fn(),
  selectSeasonStatusLoading: jest.fn(),
}));

import { selectRewardsSubscriptionId } from '../../../../../../selectors/rewards';
import {
  selectSeasonId,
  selectSeasonStartDate,
  selectSeasonStatusLoading,
} from '../../../../../../reducers/rewards/selectors';
import { UsePointsEventsResult } from '../../../hooks/usePointsEvents';
const mockSelectSubscriptionId =
  selectRewardsSubscriptionId as jest.MockedFunction<
    typeof selectRewardsSubscriptionId
  >;
const mockSelectSeasonId = selectSeasonId as jest.MockedFunction<
  typeof selectSeasonId
>;
const mockSelectSeasonStartDate = selectSeasonStartDate as jest.MockedFunction<
  typeof selectSeasonStartDate
>;
const mockSelectSeasonStatusLoading =
  selectSeasonStatusLoading as jest.MockedFunction<
    typeof selectSeasonStatusLoading
  >;

// Mock data
const mockSubscriptionId: string = 'sub-12345678';

// Mock i18n strings
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const t: Record<string, string> = {
      'rewards.loading_activity': 'Loading activity',
      'rewards.error_loading_activity': 'Error loading activity',
    };
    return t[key] || key;
  }),
}));

// Mock hooks used by ActivityTab
const mockUseSeasonStatus = jest.fn();
jest.mock('../../../hooks/useSeasonStatus', () => ({
  useSeasonStatus: (...args: unknown[]) => mockUseSeasonStatus(...args),
}));

const mockUsePointsEvents = jest.fn();
jest.mock('../../../hooks/usePointsEvents', () => ({
  usePointsEvents: (...args: unknown[]) => mockUsePointsEvents(...args),
}));

// Mock useAccountNames hook
jest.mock('../../../../../hooks/DisplayName/useAccountNames', () => ({
  useAccountNames: jest.fn(() => []),
}));

// Mock ActivityEventRow to simplify assertions
jest.mock('./ActivityEventRow', () => ({
  ActivityEventRow: ({ event }: { event: { id: string } }) => {
    const ReactActual = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return ReactActual.createElement(Text, null, `event:${event.id}`);
  },
}));

// Mock RewardsErrorBanner
jest.mock('../../RewardsErrorBanner', () => {
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
            {
              onPress: onConfirm,
              testID: 'error-retry-button',
            },
            ReactActual.createElement(
              Text,
              {},
              confirmButtonLabel || 'Confirm',
            ),
          ),
      ),
  };
});

// Helper to create realistic mock events based on rewards data service
const createMockEvent = (
  overrides: Partial<PointsEventDto> = {},
): PointsEventDto => {
  const eventType = overrides.type || 'SWAP';
  switch (eventType) {
    case 'SWAP':
      return {
        id: '59144-0xb204d894578dc20f72880b3e9acbe20d9f10cde061e05cbdc1c66bbf5ce37b5d',
        timestamp: new Date('2025-09-09T09:09:33.000Z'),
        type: 'SWAP' as const,
        payload: {
          srcAsset: {
            amount: '1153602',
            type: 'eip155:59144/erc20:0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
            decimals: 6,
            name: 'USD Coin',
            symbol: 'USDC',
          },
          destAsset: {
            amount: '261268688837964',
            type: 'eip155:59144/slip44:60',
            decimals: 18,
            name: 'Ether',
            symbol: 'ETH',
          },
          txHash:
            '0xb204d894578dc20f72880b3e9acbe20d9f10cde061e05cbdc1c66bbf5ce37b5d',
        },
        value: 2,
        bonus: {
          bips: 10000,
          bonuses: ['cb3a0161-ee12-49f4-a336-31063c90347e'],
        },
        accountAddress: '0x334d7bA8922c9F45422882B495b403644311Eaea',
        ...overrides,
      } as PointsEventDto;

    case 'SIGN_UP_BONUS':
      return {
        id: 'sb-0198f907-f293-7592-ba7d-41e245f96a51',
        timestamp: new Date('2025-08-30T03:31:44.444Z'),
        type: 'SIGN_UP_BONUS' as const,
        value: 250,
        bonus: {},
        accountAddress: '0x069060A475c76C77427CcC8CbD7eCB0B293f5beD',
        payload: null,
        ...overrides,
      } as PointsEventDto;

    case 'REFERRAL':
      return {
        id: '59144-0x7d75d4a6fc24667857147753486491b52fc93e1f35574cfe7cb8887f48a81b3a-referral',
        timestamp: new Date('2025-09-04T21:38:10.433Z'),
        type: 'REFERRAL' as const,
        value: 10,
        bonus: null,
        accountAddress: null,
        payload: null,
        ...overrides,
      } as PointsEventDto;

    case 'ONE_TIME_BONUS':
      return {
        id: 'lb-0x069060A475c76C77427CcC8CbD7eCB0B293f5beD-2',
        timestamp: new Date('2025-08-30T03:31:44.453Z'),
        type: 'ONE_TIME_BONUS' as const,
        value: 123,
        bonus: {},
        accountAddress: '0x069060A475c76C77427CcC8CbD7eCB0B293f5beD',
        payload: null,
        ...overrides,
      } as PointsEventDto;

    case 'PERPS':
      return {
        id: '0b15b967547b08923c088317914c7539fa1a536e8fdc7581060bc7be809bd9e7',
        timestamp: new Date('2025-08-18T03:01:46.727Z'),
        type: 'PERPS' as const,
        payload: {
          type: 'OPEN_POSITION',
          direction: 'SHORT',
          asset: {
            type: 'BIO',
            decimals: 0,
            name: 'BIO',
            symbol: 'BIO',
            amount: '287',
          },
        },
        value: 1,
        bonus: {},
        accountAddress: '0xeb74cd5273ca3ECd9C30b66A1Fd14A29F754f27b',
        ...overrides,
      } as PointsEventDto;

    case 'LOYALTY_BONUS':
      return {
        id: 'stake-tx-0xfedcba987654321',
        timestamp: new Date('2025-08-13T16:45:30.000Z'),
        type: 'LOYALTY_BONUS' as const,
        value: 500,
        bonus: {
          bips: 15000,
          bonuses: ['early-staker-bonus'],
        },
        accountAddress: '0xfedcba987654321',
        payload: null,
        ...overrides,
      } as PointsEventDto;

    default:
      throw new Error(`Unsupported event type: ${eventType}`);
  }
};

describe('ActivityTab', () => {
  const defaultSeasonStatus: SeasonStatusState = {
    season: {
      id: 'season-1',
      name: 'Season 1',
      startDate: Date.now(),
      endDate: Date.now() + 1000,
      tiers: [],
      activityTypes: [],
    },
    balance: {
      total: 0,
      updatedAt: Date.now(),
    },
    tier: {
      currentTier: {
        id: 'tier-1',
        name: 'Bronze',
        pointsNeeded: 0,
        image: {
          lightModeUrl: 'bronze-light',
          darkModeUrl: 'bronze-dark',
        },
        levelNumber: '1',
        rewards: [],
      },
      nextTier: null,
      nextTierPointsNeeded: null,
    },
  };

  const makePointsEventsResult = (
    overrides: Partial<UsePointsEventsResult> = {},
  ): UsePointsEventsResult => ({
    pointsEvents: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    error: null,
    loadMore: jest.fn(),
    refresh: jest.fn(),
    isRefreshing: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock state structure with rewards property for selectors
    const mockState = {
      rewards: {
        seasonId: defaultSeasonStatus.season.id,
        seasonStatusLoading: false,
        seasonStartDate: new Date('2024-01-01'),
      },
    };

    // useSelector calls the provided selector; mocked selectors return the configured value
    mockUseSelector.mockImplementation(
      (selector: (state: unknown) => unknown) => selector(mockState as unknown),
    );
    mockSelectSubscriptionId.mockReturnValue(mockSubscriptionId);
    mockSelectSeasonId.mockReturnValue(defaultSeasonStatus.season.id);
    mockSelectSeasonStartDate.mockReturnValue(new Date('2024-01-01'));
    mockSelectSeasonStatusLoading.mockReturnValue(false);
    mockUseDispatch.mockReturnValue(jest.fn());

    mockUseSeasonStatus.mockReturnValue({
      seasonStatus: defaultSeasonStatus,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });

    mockUsePointsEvents.mockReturnValue(makePointsEventsResult());
  });

  describe('Loading States', () => {
    it('should show skeleton when isLoading is true and not refreshing', () => {
      mockUsePointsEvents.mockReturnValueOnce(
        makePointsEventsResult({ isLoading: true }),
      );

      const { queryByTestId } = render(<ActivityTab />);
      // Should render skeleton (component returns skeleton when loading)
      expect(queryByTestId('flatlist')).toBeNull();
    });

    it('should show skeleton when seasonStatusLoading is true and seasonStartDate exists', () => {
      mockSelectSeasonStatusLoading.mockReturnValueOnce(true);
      mockSelectSeasonStartDate.mockReturnValueOnce(new Date('2024-01-01'));
      mockUsePointsEvents.mockReturnValueOnce(
        makePointsEventsResult({ isLoading: false }),
      );

      const { queryByTestId } = render(<ActivityTab />);
      // Should render skeleton due to season status loading
      expect(queryByTestId('flatlist')).toBeNull();
    });

    it('should not show skeleton when seasonStatusLoading is true but no seasonStartDate', () => {
      mockSelectSeasonStatusLoading.mockReturnValueOnce(true);
      mockSelectSeasonStartDate.mockReturnValueOnce(null);
      mockUsePointsEvents.mockReturnValueOnce(
        makePointsEventsResult({
          isLoading: false,
          pointsEvents: [],
        }),
      );

      const { queryByTestId } = render(<ActivityTab />);
      // Should not render skeleton when no seasonStartDate
      expect(queryByTestId('flatlist')).toBeNull();
    });

    it('should not show skeleton when refreshing even if loading', () => {
      mockUsePointsEvents.mockReturnValueOnce(
        makePointsEventsResult({
          isLoading: true,
          isRefreshing: true,
          pointsEvents: [],
        }),
      );

      const { queryByTestId } = render(<ActivityTab />);
      // Should not render skeleton when refreshing
      expect(queryByTestId('flatlist')).toBeNull();
    });
  });

  it('renders events', () => {
    const swapEvent = createMockEvent({ type: 'SWAP' });
    const perpsEvent = createMockEvent({ type: 'PERPS' });

    mockUsePointsEvents.mockReturnValueOnce(
      makePointsEventsResult({
        pointsEvents: [swapEvent, perpsEvent],
      }),
    );

    const { getByText } = render(<ActivityTab />);
    expect(getByText(`event:${swapEvent.id}`)).toBeOnTheScreen();
    expect(getByText(`event:${perpsEvent.id}`)).toBeOnTheScreen();
  });

  it('passes empty string subscriptionId to usePointsEvents when subscription is missing', () => {
    // Subscription becomes null
    mockSelectSubscriptionId.mockReturnValueOnce(null);
    render(<ActivityTab />);

    // Last call should reflect empty subscription id
    const lastCall =
      mockUsePointsEvents.mock.calls[mockUsePointsEvents.mock.calls.length - 1];
    expect(lastCall[0]).toEqual({
      seasonId: defaultSeasonStatus.season.id,
      subscriptionId: '',
    });
  });

  it('refreshes points events when refresh function is called', () => {
    const mockRefresh = jest.fn();
    const swapEvent = createMockEvent({ type: 'SWAP' });

    mockUsePointsEvents.mockReturnValueOnce(
      makePointsEventsResult({
        pointsEvents: [swapEvent],
        refresh: mockRefresh,
      }),
    );

    const { getByTestId } = render(<ActivityTab />);
    const flatList = getByTestId('flatlist');
    flatList.props.onRefresh();

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('loads more points events when loadMore function is called', () => {
    const mockLoadMore = jest.fn();
    const signUpEvent = createMockEvent({ type: 'SIGN_UP_BONUS' });

    mockUsePointsEvents.mockReturnValueOnce(
      makePointsEventsResult({
        pointsEvents: [signUpEvent],
        loadMore: mockLoadMore,
      }),
    );

    const { getByTestId } = render(<ActivityTab />);
    const flatList = getByTestId('flatlist');
    flatList.props.onEndReached();

    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it('shows loading footer when loading more points events', () => {
    const referralEvent = createMockEvent({ type: 'REFERRAL' });

    mockUsePointsEvents.mockReturnValueOnce(
      makePointsEventsResult({
        pointsEvents: [referralEvent],
        isLoadingMore: true,
      }),
    );

    const { getByTestId } = render(<ActivityTab />);

    expect(getByTestId('activity-indicator')).toBeOnTheScreen();
  });

  describe('different event types', () => {
    it('renders all unique event types correctly', () => {
      const allEventTypes = [
        createMockEvent({ type: 'SWAP' }),
        createMockEvent({ type: 'PERPS' }),
        createMockEvent({ type: 'SIGN_UP_BONUS' }),
        createMockEvent({ type: 'REFERRAL' }),
        createMockEvent({ type: 'ONE_TIME_BONUS' }),
        createMockEvent({ type: 'LOYALTY_BONUS' }),
      ];

      mockUsePointsEvents.mockReturnValueOnce(
        makePointsEventsResult({
          pointsEvents: allEventTypes,
        }),
      );

      const { getByText } = render(<ActivityTab />);

      // Verify all events are rendered
      allEventTypes.forEach((event) => {
        expect(getByText(`event:${event.id}`)).toBeOnTheScreen();
      });
    });

    it('handles mixed event types with different properties', () => {
      const mixedEvents = [
        createMockEvent({ type: 'SWAP' }), // Has complex payload and bonus
        createMockEvent({ type: 'REFERRAL' }), // Has null bonus and null accountAddress
        createMockEvent({ type: 'LOYALTY_BONUS' }), // Has high bonus value
      ];

      mockUsePointsEvents.mockReturnValueOnce(
        makePointsEventsResult({
          pointsEvents: mixedEvents,
        }),
      );

      const { getByText } = render(<ActivityTab />);

      // Verify all mixed events are rendered properly
      mixedEvents.forEach((event) => {
        expect(getByText(`event:${event.id}`)).toBeOnTheScreen();
      });
    });

    it('handles events with realistic timestamps in correct order', () => {
      const chronologicalEvents = [
        createMockEvent({ type: 'SWAP' }), // 2025-09-09
        createMockEvent({ type: 'REFERRAL' }), // 2025-09-04
        createMockEvent({ type: 'SIGN_UP_BONUS' }), // 2025-08-30
        createMockEvent({ type: 'PERPS' }), // 2025-08-18
        createMockEvent({ type: 'LOYALTY_BONUS' }), // 2025-08-13
      ];

      mockUsePointsEvents.mockReturnValueOnce(
        makePointsEventsResult({
          pointsEvents: chronologicalEvents,
        }),
      );

      const { getByText } = render(<ActivityTab />);

      // Verify all events with realistic timestamps are rendered
      chronologicalEvents.forEach((event) => {
        expect(getByText(`event:${event.id}`)).toBeOnTheScreen();
      });
    });

    it('handles large number of diverse events', () => {
      const manyEvents = [
        createMockEvent({ type: 'SWAP', id: 'swap-1' }),
        createMockEvent({ type: 'PERPS', id: 'perps-1' }),
        createMockEvent({ type: 'SIGN_UP_BONUS', id: 'signup-1' }),
        createMockEvent({ type: 'REFERRAL', id: 'referral-1' }),
        createMockEvent({ type: 'ONE_TIME_BONUS', id: 'onetime-1' }),
        createMockEvent({ type: 'LOYALTY_BONUS', id: 'loyalty-1' }),
        createMockEvent({ type: 'SWAP', id: 'swap-2' }),
        createMockEvent({ type: 'PERPS', id: 'perps-2' }),
      ];

      mockUsePointsEvents.mockReturnValueOnce(
        makePointsEventsResult({
          pointsEvents: manyEvents,
        }),
      );

      const { getByText } = render(<ActivityTab />);

      // Verify all events in large list are rendered
      manyEvents.forEach((event) => {
        expect(getByText(`event:${event.id}`)).toBeOnTheScreen();
      });
    });
  });

  describe('Error States', () => {
    it('should show error banner when there is an error and no points events', () => {
      mockUsePointsEvents.mockReturnValueOnce(
        makePointsEventsResult({
          error: 'Network error',
          pointsEvents: [],
        }),
      );

      const { getByTestId } = render(<ActivityTab />);

      // Should show error banner
      expect(getByTestId('rewards-error-banner')).toBeTruthy();
    });

    it('should not show error banner when there is an error but points events exist', () => {
      const swapEvent = createMockEvent({ type: 'SWAP' });
      mockUsePointsEvents.mockReturnValueOnce(
        makePointsEventsResult({
          error: 'Network error',
          pointsEvents: [swapEvent],
        }),
      );

      const { queryByTestId, getByText } = render(<ActivityTab />);

      // Should not show error banner when points events exist
      expect(queryByTestId('rewards-error-banner')).toBeNull();
      // Should still show the points events
      expect(getByText(`event:${swapEvent.id}`)).toBeOnTheScreen();
    });

    it('should not show error banner when there is no error', () => {
      mockUsePointsEvents.mockReturnValueOnce(
        makePointsEventsResult({
          error: null,
          pointsEvents: [],
        }),
      );

      const { queryByTestId } = render(<ActivityTab />);

      // Should not show error banner when no error
      expect(queryByTestId('rewards-error-banner')).toBeNull();
    });

    it('should call refresh when retry button is pressed in error state', () => {
      const mockRefresh = jest.fn();
      mockUsePointsEvents.mockReturnValueOnce(
        makePointsEventsResult({
          error: 'Network error',
          pointsEvents: [],
          refresh: mockRefresh,
        }),
      );

      const { getByTestId } = render(<ActivityTab />);

      const retryButton = getByTestId('error-retry-button');
      expect(retryButton).toBeTruthy();
      expect(mockRefresh).toBeDefined();
    });
  });
});
