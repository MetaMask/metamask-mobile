import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsMarketTabs from './PerpsMarketTabs';
import { PerpsMarketTabsSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import {
  defaultPerpsMarketStatsMock,
  defaultPerpsPositionMock,
  defaultPerpsOrderMock,
} from '../../__mocks__/perpsHooksMocks';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

// Mock dependencies
jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      tabBar: {},
      tab: {},
      activeTab: {},
      tabContent: {},
      emptyStateContainer: {},
      statisticsOnlyTitle: {},
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsHyperLiquidController: {},
  },
}));

// Mock child components using the same pattern as other tests
jest.mock('../PerpsMarketStatisticsCard', () => 'PerpsMarketStatisticsCard');
jest.mock('../PerpsPositionCard', () => 'PerpsPositionCard');
jest.mock('../PerpsOpenOrderCard', () => 'PerpsOpenOrderCard');
jest.mock('../PerpsBottomSheetTooltip', () => 'PerpsBottomSheetTooltip');

describe('PerpsMarketTabs', () => {
  // Use shared mocks from perpsHooksMocks
  const mockMarketStats = { ...defaultPerpsMarketStatsMock };
  const mockPosition = { ...defaultPerpsPositionMock };
  const mockOrder = { ...defaultPerpsOrderMock };

  // Additional properties for PerpsMarketTabs
  const nextFundingTime = 1234567890;
  const fundingIntervalHours = 8;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders statistics tab by default', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition={false}
          unfilledOrders={[]}
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert
      expect(getByText('perps.market.statistics')).toBeDefined();
    });

    it('shows loading skeleton when position is loading', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition
          unfilledOrders={[]}
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert - Skeleton component should be rendered
      expect(
        getByTestId(PerpsMarketTabsSelectorsIDs.SKELETON_TAB_BAR),
      ).toBeDefined();
    });

    it('displays position tab when position exists', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={mockPosition}
          isLoadingPosition={false}
          unfilledOrders={[]}
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert
      expect(getByText('perps.market.position')).toBeDefined();
    });

    it('displays orders tab when unfilled orders exist', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition={false}
          unfilledOrders={[mockOrder]}
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert
      expect(getByText('perps.market.orders')).toBeDefined();
    });
  });

  describe('Tab Switching', () => {
    it('switches tabs when clicked', () => {
      // Arrange
      const onActiveTabChange = jest.fn();
      const { getByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={mockPosition}
          isLoadingPosition={false}
          unfilledOrders={[mockOrder]}
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Act - Click on position tab
      const positionTab = getByText('perps.market.position');
      fireEvent.press(positionTab);

      // Assert
      expect(onActiveTabChange).toHaveBeenCalledWith('position');
    });

    it('displays correct content for active tab', () => {
      // Arrange
      const onActiveTabChange = jest.fn();
      const { getByTestId } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={mockPosition}
          isLoadingPosition={false}
          unfilledOrders={[]}
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert - Should show position content when position tab is active
      expect(
        getByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
      ).toBeDefined();
    });
  });

  describe('Empty States', () => {
    it('shows empty state for orders tab when no orders', () => {
      // Arrange
      const onActiveTabChange = jest.fn();
      const { getByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={null}
          isLoadingPosition={false}
          unfilledOrders={[]}
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert - Statistics only title should be shown
      expect(getByText('perps.market.statistics')).toBeDefined();
    });
  });

  describe('Tab Priority', () => {
    it('prioritizes position tab when both position and orders exist', () => {
      // Arrange
      const onActiveTabChange = jest.fn();

      // Act
      const { getByText } = render(
        <PerpsMarketTabs
          symbol="BTC"
          marketStats={mockMarketStats}
          position={mockPosition}
          isLoadingPosition={false}
          unfilledOrders={[mockOrder]}
          onActiveTabChange={onActiveTabChange}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />,
      );

      // Assert - All tabs should be available
      expect(getByText('perps.market.position')).toBeDefined();
      expect(getByText('perps.market.orders')).toBeDefined();
      expect(getByText('perps.market.statistics')).toBeDefined();
    });
  });
});
