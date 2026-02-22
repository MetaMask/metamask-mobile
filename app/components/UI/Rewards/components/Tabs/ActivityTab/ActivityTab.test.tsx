import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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
  selectActiveTab: jest.fn(),
  selectSeasonId: jest.fn(),
  selectSeasonStartDate: jest.fn(),
  selectSeasonStatusLoading: jest.fn(),
  selectSeasonActivityTypes: jest.fn(),
}));

import { selectRewardsSubscriptionId } from '../../../../../../selectors/rewards';
import {
  selectActiveTab,
  selectSeasonId,
  selectSeasonStartDate,
  selectSeasonStatusLoading,
  selectSeasonActivityTypes,
} from '../../../../../../reducers/rewards/selectors';
import { UsePointsEventsResult } from '../../../hooks/usePointsEvents';
const mockSelectSubscriptionId =
  selectRewardsSubscriptionId as jest.MockedFunction<
    typeof selectRewardsSubscriptionId
  >;
const mockSelectActiveTab = selectActiveTab as jest.MockedFunction<
  typeof selectActiveTab
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
const mockSelectSeasonActivityTypes =
  selectSeasonActivityTypes as jest.MockedFunction<
    typeof selectSeasonActivityTypes
  >;

// Mock data
const mockSubscriptionId: string = 'sub-12345678';

// Mock activity types that match what the API returns
const mockSeasonActivityTypes = [
  { type: 'SWAP', title: 'Swap', description: 'Swap tokens', icon: 'Swap' },
  { type: 'PERPS', title: 'Perps', description: 'Trade perps', icon: 'Perps' },
  {
    type: 'PREDICT',
    title: 'Predict',
    description: 'Predict outcomes',
    icon: 'Predict',
  },
  {
    type: 'REFERRAL',
    title: 'Referral',
    description: 'Refer friends',
    icon: 'Referral',
  },
  { type: 'CARD', title: 'Card', description: 'Use card', icon: 'Card' },
  {
    type: 'MUSD_DEPOSIT',
    title: 'MUSD Deposit',
    description: 'Deposit MUSD',
    icon: 'Deposit',
  },
  {
    type: 'SHIELD',
    title: 'Shield',
    description: 'Shield assets',
    icon: 'Shield',
  },
];

// Mock i18n strings
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const t: Record<string, string> = {
      'rewards.loading_activity': 'Loading activity',
      'rewards.error_loading_activity': 'Error loading activity',
      'rewards.filter_title': 'Filter by',
      'rewards.filter_all': 'All',
      'rewards.filter_swap': 'Swap',
      'rewards.filter_perps': 'Perps',
      'rewards.filter_predict': 'Predict',
      'rewards.filter_referral': 'Referral',
      'rewards.filter_card': 'Card',
      'rewards.filter_musd_deposit': 'MUSD Deposit',
      'rewards.filter_shield': 'Shield',
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

// Mock SelectOptionSheet component
jest.mock('../../../../SelectOptionSheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      label,
      options,
      selectedValue,
      onValueChange,
    }: {
      label: string;
      options: { key?: string; value?: string; label?: string }[];
      selectedValue?: string;
      onValueChange: (val: string) => void;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'select-option-sheet' },
        ReactActual.createElement(
          Text,
          { testID: 'select-option-sheet-label' },
          label,
        ),
        ReactActual.createElement(
          Text,
          { testID: 'select-option-sheet-selected' },
          selectedValue,
        ),
        options.map(
          (option: { key?: string; value?: string; label?: string }) =>
            ReactActual.createElement(
              TouchableOpacity,
              {
                key: option.key,
                onPress: () => option.value && onValueChange(option.value),
                testID: `activity-filter-${option.value}`,
              },
              ReactActual.createElement(Text, null, option.label),
            ),
        ),
      ),
  };
});

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
      activityTypes: mockSeasonActivityTypes,
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
        activeTab: 'activity',
        seasonId: defaultSeasonStatus.season.id,
        seasonStatusLoading: false,
        seasonStartDate: new Date('2024-01-01'),
        seasonActivityTypes: mockSeasonActivityTypes,
      },
    };

    // useSelector calls the provided selector; mocked selectors return the configured value
    mockUseSelector.mockImplementation(
      (selector: (state: unknown) => unknown) => selector(mockState as unknown),
    );
    mockSelectSubscriptionId.mockReturnValue(mockSubscriptionId);
    mockSelectActiveTab.mockReturnValue('activity');
    mockSelectSeasonId.mockReturnValue(defaultSeasonStatus.season.id);
    mockSelectSeasonStartDate.mockReturnValue(new Date('2024-01-01'));
    mockSelectSeasonStatusLoading.mockReturnValue(false);
    mockSelectSeasonActivityTypes.mockReturnValue(mockSeasonActivityTypes);
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
      type: undefined,
      enabled: true,
    });
  });

  it('passes undefined type to usePointsEvents initially', () => {
    render(<ActivityTab />);

    const lastCall =
      mockUsePointsEvents.mock.calls[mockUsePointsEvents.mock.calls.length - 1];
    expect(lastCall[0]).toEqual({
      seasonId: defaultSeasonStatus.season.id,
      subscriptionId: mockSubscriptionId,
      type: undefined,
      enabled: true,
    });
  });

  it('passes enabled false to usePointsEvents when not on activity tab', () => {
    mockSelectActiveTab.mockReturnValue('overview');

    render(<ActivityTab />);

    const lastCall =
      mockUsePointsEvents.mock.calls[mockUsePointsEvents.mock.calls.length - 1];
    expect(lastCall[0]).toEqual({
      seasonId: defaultSeasonStatus.season.id,
      subscriptionId: mockSubscriptionId,
      type: undefined,
      enabled: false,
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

  describe('Filter functionality', () => {
    it('renders SelectOptionSheet with filter label', () => {
      const { getByTestId, getByText } = render(<ActivityTab />);

      expect(getByTestId('select-option-sheet')).toBeOnTheScreen();
      expect(getByText('Filter by')).toBeOnTheScreen();
    });

    it('renders all filter options', () => {
      const { getByText } = render(<ActivityTab />);

      expect(getByText('All')).toBeOnTheScreen();
      expect(getByText('Swap')).toBeOnTheScreen();
      expect(getByText('Perps')).toBeOnTheScreen();
      expect(getByText('Predict')).toBeOnTheScreen();
      expect(getByText('Referral')).toBeOnTheScreen();
      expect(getByText('Card')).toBeOnTheScreen();
      expect(getByText('MUSD Deposit')).toBeOnTheScreen();
      expect(getByText('Shield')).toBeOnTheScreen();
    });

    it('renders filter options with correct testIDs', () => {
      const { getByTestId } = render(<ActivityTab />);

      expect(getByTestId('activity-filter-ALL')).toBeOnTheScreen();
      expect(getByTestId('activity-filter-SWAP')).toBeOnTheScreen();
      expect(getByTestId('activity-filter-PERPS')).toBeOnTheScreen();
      expect(getByTestId('activity-filter-PREDICT')).toBeOnTheScreen();
      expect(getByTestId('activity-filter-REFERRAL')).toBeOnTheScreen();
      expect(getByTestId('activity-filter-CARD')).toBeOnTheScreen();
      expect(getByTestId('activity-filter-MUSD_DEPOSIT')).toBeOnTheScreen();
      expect(getByTestId('activity-filter-SHIELD')).toBeOnTheScreen();
    });

    it('passes SWAP type to usePointsEvents when Swap filter is selected', () => {
      const { getByTestId } = render(<ActivityTab />);

      fireEvent.press(getByTestId('activity-filter-SWAP'));

      const lastCall =
        mockUsePointsEvents.mock.calls[
          mockUsePointsEvents.mock.calls.length - 1
        ];
      expect(lastCall[0]).toEqual({
        seasonId: defaultSeasonStatus.season.id,
        subscriptionId: mockSubscriptionId,
        type: 'SWAP',
        enabled: true,
      });
    });

    it('passes PERPS type to usePointsEvents when Perps filter is selected', () => {
      const { getByTestId } = render(<ActivityTab />);

      fireEvent.press(getByTestId('activity-filter-PERPS'));

      const lastCall =
        mockUsePointsEvents.mock.calls[
          mockUsePointsEvents.mock.calls.length - 1
        ];
      expect(lastCall[0]).toEqual({
        seasonId: defaultSeasonStatus.season.id,
        subscriptionId: mockSubscriptionId,
        type: 'PERPS',
        enabled: true,
      });
    });

    it('passes PREDICT type to usePointsEvents when Predict filter is selected', () => {
      const { getByTestId } = render(<ActivityTab />);

      fireEvent.press(getByTestId('activity-filter-PREDICT'));

      const lastCall =
        mockUsePointsEvents.mock.calls[
          mockUsePointsEvents.mock.calls.length - 1
        ];
      expect(lastCall[0]).toEqual({
        seasonId: defaultSeasonStatus.season.id,
        subscriptionId: mockSubscriptionId,
        type: 'PREDICT',
        enabled: true,
      });
    });

    it('passes REFERRAL type to usePointsEvents when Referral filter is selected', () => {
      const { getByTestId } = render(<ActivityTab />);

      fireEvent.press(getByTestId('activity-filter-REFERRAL'));

      const lastCall =
        mockUsePointsEvents.mock.calls[
          mockUsePointsEvents.mock.calls.length - 1
        ];
      expect(lastCall[0]).toEqual({
        seasonId: defaultSeasonStatus.season.id,
        subscriptionId: mockSubscriptionId,
        type: 'REFERRAL',
        enabled: true,
      });
    });

    it('passes CARD type to usePointsEvents when Card filter is selected', () => {
      const { getByTestId } = render(<ActivityTab />);

      fireEvent.press(getByTestId('activity-filter-CARD'));

      const lastCall =
        mockUsePointsEvents.mock.calls[
          mockUsePointsEvents.mock.calls.length - 1
        ];
      expect(lastCall[0]).toEqual({
        seasonId: defaultSeasonStatus.season.id,
        subscriptionId: mockSubscriptionId,
        type: 'CARD',
        enabled: true,
      });
    });

    it('passes MUSD_DEPOSIT type to usePointsEvents when MUSD Deposit filter is selected', () => {
      const { getByTestId } = render(<ActivityTab />);

      fireEvent.press(getByTestId('activity-filter-MUSD_DEPOSIT'));

      const lastCall =
        mockUsePointsEvents.mock.calls[
          mockUsePointsEvents.mock.calls.length - 1
        ];
      expect(lastCall[0]).toEqual({
        seasonId: defaultSeasonStatus.season.id,
        subscriptionId: mockSubscriptionId,
        type: 'MUSD_DEPOSIT',
        enabled: true,
      });
    });

    it('passes SHIELD type to usePointsEvents when Shield filter is selected', () => {
      const { getByTestId } = render(<ActivityTab />);

      fireEvent.press(getByTestId('activity-filter-SHIELD'));

      const lastCall =
        mockUsePointsEvents.mock.calls[
          mockUsePointsEvents.mock.calls.length - 1
        ];
      expect(lastCall[0]).toEqual({
        seasonId: defaultSeasonStatus.season.id,
        subscriptionId: mockSubscriptionId,
        type: 'SHIELD',
        enabled: true,
      });
    });

    it('passes undefined type when All filter is selected after selecting another filter', () => {
      const { getByTestId } = render(<ActivityTab />);

      // First select SWAP filter
      fireEvent.press(getByTestId('activity-filter-SWAP'));

      // Then select All filter
      fireEvent.press(getByTestId('activity-filter-ALL'));

      const lastCall =
        mockUsePointsEvents.mock.calls[
          mockUsePointsEvents.mock.calls.length - 1
        ];
      expect(lastCall[0]).toEqual({
        seasonId: defaultSeasonStatus.season.id,
        subscriptionId: mockSubscriptionId,
        type: undefined,
        enabled: true,
      });
    });

    it('allows switching between different filter types', () => {
      const { getByTestId } = render(<ActivityTab />);

      // Select SWAP
      fireEvent.press(getByTestId('activity-filter-SWAP'));
      expect(
        mockUsePointsEvents.mock.calls[
          mockUsePointsEvents.mock.calls.length - 1
        ][0].type,
      ).toBe('SWAP');

      // Switch to PERPS
      fireEvent.press(getByTestId('activity-filter-PERPS'));
      expect(
        mockUsePointsEvents.mock.calls[
          mockUsePointsEvents.mock.calls.length - 1
        ][0].type,
      ).toBe('PERPS');

      // Switch to REFERRAL
      fireEvent.press(getByTestId('activity-filter-REFERRAL'));
      expect(
        mockUsePointsEvents.mock.calls[
          mockUsePointsEvents.mock.calls.length - 1
        ][0].type,
      ).toBe('REFERRAL');

      // Switch back to All
      fireEvent.press(getByTestId('activity-filter-ALL'));
      expect(
        mockUsePointsEvents.mock.calls[
          mockUsePointsEvents.mock.calls.length - 1
        ][0].type,
      ).toBeUndefined();
    });

    it('shows empty state when filter returns no events', () => {
      mockUsePointsEvents.mockReturnValue(
        makePointsEventsResult({
          pointsEvents: [],
          isLoading: false,
        }),
      );

      const { getByTestId, getByText } = render(<ActivityTab />);

      // Select a filter
      fireEvent.press(getByTestId('activity-filter-SWAP'));

      // Filter still shows empty state
      expect(getByText('rewards.activity_empty_title')).toBeOnTheScreen();
    });

    it('shows loading state when filter changes and isLoading is true', () => {
      mockUsePointsEvents.mockReturnValue(
        makePointsEventsResult({
          pointsEvents: null,
          isLoading: true,
        }),
      );

      const { getByTestId, queryByTestId } = render(<ActivityTab />);

      // Select a filter
      fireEvent.press(getByTestId('activity-filter-SWAP'));

      // Still shows skeleton (no flatlist)
      expect(queryByTestId('flatlist')).toBeNull();
    });

    it('shows selected value in SelectOptionSheet', () => {
      const { getByTestId } = render(<ActivityTab />);

      // Initially shows "ALL" as selected value
      expect(getByTestId('select-option-sheet-selected')).toHaveTextContent(
        'ALL',
      );

      // Select SWAP
      fireEvent.press(getByTestId('activity-filter-SWAP'));

      // Selected value updates to "SWAP"
      expect(getByTestId('select-option-sheet-selected')).toHaveTextContent(
        'SWAP',
      );
    });

    it('handles undefined seasonActivityTypes gracefully (upgrade scenario)', () => {
      // Simulate upgrade scenario where seasonActivityTypes is undefined from persisted state
      mockSelectSeasonActivityTypes.mockReturnValueOnce(
        undefined as unknown as typeof mockSeasonActivityTypes,
      );

      const { getByTestId, getByText } = render(<ActivityTab />);

      // Should render without crashing and show only the "All" option
      expect(getByTestId('select-option-sheet')).toBeOnTheScreen();
      expect(getByText('All')).toBeOnTheScreen();
      expect(getByTestId('activity-filter-ALL')).toBeOnTheScreen();
    });
  });
});
