/**
 * PerpsToggleBlock — unit tests
 *
 * Core concerns:
 * 1. Renders title and the default pill's items.
 * 2. "View All" button calls onViewAll with the active pill key and the
 * sortOptionId prop — this is the critical wiring introduced alongside the
 * sort-param feature.
 * 3. Switching pills updates the key passed to onViewAll.
 * 4. Shows skeletons while loading.
 * 5. Analytics: trackExploreInteracted is called when a row is pressed.
 */

jest.mock('@shopify/flash-list', () => {
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return { FlashList: RN.FlatList };
});

jest.mock('../../search/analytics', () => ({
  trackExploreInteracted: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const twFn = () => ({});
  twFn.style = () => ({});
  return { useTailwind: () => twFn };
});

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import type { PerpsMarketData, SortOptionId } from '@metamask/perps-controller';
import { trackExploreInteracted } from '../../search/analytics';
import PerpsToggleBlock, {
  type PerpsToggleBlockProps,
} from './PerpsToggleBlock';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMarket = (symbol: string): PerpsMarketData =>
  ({
    symbol,
    name: `${symbol} Market`,
    price: '$1.00',
    change24h: '+1%',
    change24hPercent: '1',
    volume: '$100M',
    maxLeverage: '10x',
    isHip3: true,
    marketType: 'equity',
  }) as PerpsMarketData;

// Minimal PerpsRowItem mock — renders the symbol so assertions are simple.
jest.mock('./PerpsRowItem', () => {
  const { TouchableOpacity, Text: RNText } = jest.requireActual('react-native');
  return function MockPerpsRowItem({
    market,
    onCardPress,
  }: {
    market: PerpsMarketData;
    onCardPress?: () => void;
  }) {
    return (
      <TouchableOpacity
        testID={`perps-row-${market.symbol}`}
        onPress={onCardPress}
      >
        <RNText>{market.symbol}</RNText>
      </TouchableOpacity>
    );
  };
});

jest.mock('../../../../UI/Perps/components/PerpsRowSkeleton', () => {
  const { View, Text: RNText } = jest.requireActual('react-native');
  return function MockPerpsRowSkeleton() {
    return (
      <View>
        <RNText testID="perps-row-skeleton">skeleton</RNText>
      </View>
    );
  };
});

const Skeleton = () => <Text testID="skeleton-item">sk</Text>;

const STOCKS_MARKETS = [makeMarket('AAPL'), makeMarket('GOOGL')];
const COMMODITY_MARKETS = [makeMarket('GOLD')];

const DEFAULT_TABS = [
  { key: 'stocks', name: 'Stocks', items: STOCKS_MARKETS },
  { key: 'commodities', name: 'Commodities', items: COMMODITY_MARKETS },
];

const DEFAULT_PROPS: PerpsToggleBlockProps = {
  title: 'Stocks & Commodities',
  tabs: DEFAULT_TABS,
  isLoading: false,
  defaultPillKey: 'stocks',
  onViewAll: jest.fn(),
  sortOptionId: 'volume',
  tabName: 'Macro',
  sectionName: 'perps_stocks_commodities',
  headerTestID: 'section-header-view-all-test',
  idPrefix: 'test',
  testIdPrefix: 'test-toggle',
  listTestId: 'test-list',
};

const renderBlock = (props = DEFAULT_PROPS) =>
  render(<PerpsToggleBlock {...props} />);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PerpsToggleBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the section title', () => {
      const { getByText } = renderBlock();
      expect(getByText('Stocks & Commodities')).toBeTruthy();
    });

    it('renders items for the default pill', () => {
      const { getByTestId, queryByTestId } = renderBlock();
      expect(getByTestId('perps-row-AAPL')).toBeTruthy();
      expect(getByTestId('perps-row-GOOGL')).toBeTruthy();
      expect(queryByTestId('perps-row-GOLD')).toBeNull();
    });

    it('renders pill buttons for each tab', () => {
      const { getByTestId } = renderBlock();
      expect(getByTestId('test-toggle-pill-stocks')).toBeTruthy();
      expect(getByTestId('test-toggle-pill-commodities')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('shows skeletons while isLoading is true', () => {
      const { getAllByTestId } = renderBlock({
        ...DEFAULT_PROPS,
        isLoading: true,
      });
      expect(getAllByTestId('perps-row-skeleton').length).toBeGreaterThan(0);
    });
  });

  describe('pill switching', () => {
    it('shows the commodities items after selecting the commodities pill', () => {
      const { getByTestId, queryByTestId } = renderBlock();

      act(() => {
        fireEvent.press(getByTestId('test-toggle-pill-commodities'));
      });

      expect(getByTestId('perps-row-GOLD')).toBeTruthy();
      expect(queryByTestId('perps-row-AAPL')).toBeNull();
    });

    it('switching back to stocks shows stocks items again', () => {
      const { getByTestId } = renderBlock();

      act(() => {
        fireEvent.press(getByTestId('test-toggle-pill-commodities'));
      });
      act(() => {
        fireEvent.press(getByTestId('test-toggle-pill-stocks'));
      });

      expect(getByTestId('perps-row-AAPL')).toBeTruthy();
    });
  });

  describe('View All — sort and filter forwarding', () => {
    it('calls onViewAll with the defaultPillKey and sortOptionId before any pill change', () => {
      const onViewAll = jest.fn();
      const { getByTestId } = renderBlock({ ...DEFAULT_PROPS, onViewAll });

      fireEvent.press(getByTestId('section-header-view-all-test'));

      expect(onViewAll).toHaveBeenCalledTimes(1);
      expect(onViewAll).toHaveBeenCalledWith('stocks', 'volume');
    });

    it('calls onViewAll with the newly active pill key after switching pills', () => {
      const onViewAll = jest.fn();
      const { getByTestId } = renderBlock({ ...DEFAULT_PROPS, onViewAll });

      act(() => {
        fireEvent.press(getByTestId('test-toggle-pill-commodities'));
      });

      fireEvent.press(getByTestId('section-header-view-all-test'));

      expect(onViewAll).toHaveBeenCalledWith('commodities', 'volume');
    });

    it('forwards the sortOptionId prop unchanged regardless of active pill', () => {
      const onViewAll = jest.fn();
      const { getByTestId } = renderBlock({
        ...DEFAULT_PROPS,
        sortOptionId: 'priceChange',
        onViewAll,
      });

      act(() => {
        fireEvent.press(getByTestId('test-toggle-pill-commodities'));
      });
      fireEvent.press(getByTestId('section-header-view-all-test'));

      expect(onViewAll).toHaveBeenCalledWith('commodities', 'priceChange');
    });

    it('calls onViewAll only once per press', () => {
      const onViewAll = jest.fn();
      const { getByTestId } = renderBlock({ ...DEFAULT_PROPS, onViewAll });

      fireEvent.press(getByTestId('section-header-view-all-test'));
      fireEvent.press(getByTestId('section-header-view-all-test'));

      expect(onViewAll).toHaveBeenCalledTimes(2);
    });
  });

  describe('analytics', () => {
    it('calls trackExploreInteracted with correct context when a row is pressed', () => {
      const mockTrack = trackExploreInteracted as jest.Mock;
      const { getByTestId } = renderBlock();

      fireEvent.press(getByTestId('perps-row-AAPL'));

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          interaction_type: 'section_item_tapped',
          tab_name: 'Macro',
          section_name: 'perps_stocks_commodities',
          asset_type: 'perp',
          item_clicked: 'AAPL',
        }),
      );
    });

    it('includes the correct position index in analytics', () => {
      const mockTrack = trackExploreInteracted as jest.Mock;
      const { getByTestId } = renderBlock();

      fireEvent.press(getByTestId('perps-row-GOOGL'));

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          position: 1,
          item_clicked: 'GOOGL',
        }),
      );
    });
  });
});
