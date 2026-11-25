import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import ExploreSearchResults from './ExploreSearchResults';
import type { SearchFeedSection } from './useExploreSearch';
import { analytics } from '../../../../util/analytics/analytics';

let mockIsStocksPromotionEnabled = true;
const mockScrollToOffset = jest.fn();
let lastFlashListProps: Record<string, unknown> | undefined;

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: () => true,
}));

jest.mock(
  '../../../../selectors/featureFlagController/exploreSearchPromoteStocksExactTicker',
  () => ({
    selectExploreSearchPromoteStocksExactTickerEnabled: () =>
      mockIsStocksPromotionEnabled,
  }),
);

jest.mock('@shopify/flash-list', () => {
  const ReactLib = jest.requireActual<typeof import('react')>('react');
  const { View: RNView } =
    jest.requireActual<typeof import('react-native')>('react-native');

  return {
    FlashList: ReactLib.forwardRef(
      (
        props: {
          data: unknown[];
          renderItem: (info: {
            item: unknown;
            index: number;
          }) => React.ReactNode;
          keyExtractor: (item: unknown, index: number) => string;
          onScrollBeginDrag?: () => void;
          testID?: string;
          maintainVisibleContentPosition?: { disabled?: boolean };
          getItemType?: (item: unknown) => string;
        },
        ref: React.Ref<{ scrollToOffset: typeof mockScrollToOffset }>,
      ) => {
        lastFlashListProps = props;
        ReactLib.useImperativeHandle(ref, () => ({
          scrollToOffset: mockScrollToOffset,
        }));
        const { data, renderItem, keyExtractor, onScrollBeginDrag, testID } =
          props;
        return ReactLib.createElement(
          RNView,
          { testID, onTouchMove: onScrollBeginDrag },
          data.map((item, index) =>
            ReactLib.createElement(
              RNView,
              { key: keyExtractor(item, index) },
              renderItem({ item, index }),
            ),
          ),
        );
      },
    ),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactLib = jest.requireActual<typeof import('react')>('react');
  const { Text: RNText, View: RNView } =
    jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Box: ({ children }: { children?: React.ReactNode }) =>
      ReactLib.createElement(RNView, null, children),
    BoxAlignItems: { Center: 'center' },
    BoxFlexDirection: { Row: 'row' },
    FontWeight: { Bold: 'bold' },
    Icon: () => null,
    IconColor: { IconAlternative: 'alt' },
    IconName: { ArrowRight: 'arrow-right' },
    IconSize: { Sm: 'sm' },
    TabEmptyState: () => null,
    Text: ({ children }: { children?: React.ReactNode }) =>
      ReactLib.createElement(RNText, null, children),
    TextVariant: { HeadingSm: 'headingSm', BodyMd: 'bodyMd' },
    TextColor: { TextAlternative: 'alt', TextDefault: 'default' },
    SectionDivider: () => null,
    SectionHeader: ({
      title,
      endAccessory,
    }: {
      title: string;
      endAccessory?: React.ReactNode;
    }) =>
      ReactLib.createElement(
        RNView,
        { testID: `section-header-${title}` },
        ReactLib.createElement(RNText, { testID: 'section-title' }, title),
        endAccessory,
      ),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: () => ({}) }),
}));

jest.mock(
  '../../../../component-library/components/Navigation/TabBarFloating',
  () => ({
    useFloatingTabBarInset: () => 0,
  }),
);

jest.mock(
  '../../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

jest.mock(
  '../../../UI/Trending/hooks/useSearchTracking/useSearchTracking',
  () => ({
    useSearchTracking: jest.fn(),
  }),
);

jest.mock(
  '../../../UI/Trending/components/TrendingTokensBottomSheet/TrendingTokenTimeBottomSheet',
  () => ({
    TimeOption: { TwentyFourHours: '24h' },
  }),
);

jest.mock(
  '../../../UI/Trending/components/TrendingQuickBuy/TrendingQuickBuy',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

jest.mock(
  '../../../UI/Trending/hooks/useQuickBuySearchKeyboard/useQuickBuySearchKeyboard',
  () => ({
    useQuickBuySearchKeyboard: jest.fn(),
  }),
);

jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: () => ({ variant: { showQuickTradeButton: false } }),
}));

jest.mock('../feeds/tokens/CryptoMoversPillItem', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./useExploreSearchFooterPress', () => ({
  useExploreSearchFooterPress: jest.fn(() => jest.fn()),
}));

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

const MockSearchRow = ({
  feedId,
  stocksPromoted,
}: {
  feedId: string;
  stocksPromoted?: boolean;
}) => (
  <Pressable
    testID={`row-${feedId}`}
    accessibilityLabel={String(stocksPromoted)}
  >
    <View>
      <Text>{feedId}</Text>
    </View>
  </Pressable>
);

jest.mock('./SearchFeedRow', () => ({
  __esModule: true,
  default: (props: { feedId: string; stocksPromoted?: boolean }) =>
    MockSearchRow(props),
  SearchFeedSkeleton: () => null,
  getItemId: (_feedId: string, item: { assetId?: string; symbol?: string }) =>
    item.assetId ?? item.symbol ?? 'id',
}));

const mockTrackEvent = jest.mocked(analytics.trackEvent);

const cryptoToken = {
  assetId: 'eip155:1/erc20:0x111',
  symbol: 'TSLA',
  name: 'TSLA Memecoin',
} as unknown as TrendingAsset;

const stockToken = {
  assetId: 'eip155:1/erc20:0x222',
  symbol: 'TSLAon',
  name: 'Tesla (Ondo Tokenized)',
  rwaData: {
    ticker: 'TSLA',
    instrumentType: 'equity',
  },
} as unknown as TrendingAsset;

const baseSections = (
  stocksOverrides: Partial<SearchFeedSection> = {},
): SearchFeedSection[] => [
  {
    feedId: 'tokens',
    title: 'Crypto',
    items: [cryptoToken],
    isLoading: false,
    total: 10,
  },
  {
    feedId: 'perps',
    title: 'Perps',
    items: [{ symbol: 'TSLA-USD' }],
    isLoading: false,
  },
  {
    feedId: 'stocks',
    title: 'Stocks',
    items: [stockToken],
    isLoading: false,
    total: 5,
    ...stocksOverrides,
  },
];

describe('ExploreSearchResults stocks promotion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsStocksPromotionEnabled = true;
  });

  it.each(['TSLA', 'tsla', '$TSLA', '  $tsla  ', 'Tesla', 'tesla'])(
    'renders Stocks first for exact ticker or name query %p when flag is enabled',
    (query) => {
      const { getAllByTestId } = render(
        <ExploreSearchResults
          searchQuery={query}
          sections={baseSections()}
          onViewMore={jest.fn()}
        />,
      );

      const sectionTitles = getAllByTestId('section-title').map(
        (node) => node.props.children,
      );
      expect(sectionTitles).toEqual(['Stocks', 'Crypto', 'Perps']);
    },
  );

  it.each(['TSL', 'tesl', 'eth'])(
    'keeps default section order for non-exact query %p',
    (query) => {
      const { getAllByTestId } = render(
        <ExploreSearchResults
          searchQuery={query}
          sections={baseSections()}
          onViewMore={jest.fn()}
        />,
      );

      const sectionTitles = getAllByTestId('section-title').map(
        (node) => node.props.children,
      );
      expect(sectionTitles).toEqual(['Crypto', 'Perps', 'Stocks']);
    },
  );

  it('does not reorder when remote flag is off', () => {
    mockIsStocksPromotionEnabled = false;

    const { getAllByTestId } = render(
      <ExploreSearchResults
        searchQuery="TSLA"
        sections={baseSections()}
        onViewMore={jest.fn()}
      />,
    );

    const sectionTitles = getAllByTestId('section-title').map(
      (node) => node.props.children,
    );
    expect(sectionTitles).toEqual(['Crypto', 'Perps', 'Stocks']);
  });

  it('does not reorder while Stocks is loading', () => {
    const { getAllByTestId } = render(
      <ExploreSearchResults
        searchQuery="TSLA"
        sections={baseSections({ isLoading: true })}
        onViewMore={jest.fn()}
      />,
    );

    const sectionTitles = getAllByTestId('section-title').map(
      (node) => node.props.children,
    );
    expect(sectionTitles).toEqual(['Crypto', 'Perps', 'Stocks']);
  });

  it('does not reorder when Stocks has no results', () => {
    const { getAllByTestId } = render(
      <ExploreSearchResults
        searchQuery="TSLA"
        sections={baseSections({ items: [] })}
        onViewMore={jest.fn()}
      />,
    );

    const sectionTitles = getAllByTestId('section-title').map(
      (node) => node.props.children,
    );
    expect(sectionTitles).toEqual(['Crypto', 'Perps']);
  });

  it('does not reorder when symbol matches but result has no rwaData', () => {
    const stockWithoutRwa = {
      assetId: 'eip155:1/erc20:0x222',
      symbol: 'TSLA',
      name: 'Tesla Without RWA',
    } as unknown as TrendingAsset;

    const { getAllByTestId } = render(
      <ExploreSearchResults
        searchQuery="TSLA"
        sections={baseSections({ items: [stockWithoutRwa] })}
        onViewMore={jest.fn()}
      />,
    );

    const sectionTitles = getAllByTestId('section-title').map(
      (node) => node.props.children,
    );
    expect(sectionTitles).toEqual(['Crypto', 'Perps', 'Stocks']);
  });

  it('passes stocks_promoted=true to row taps and scroll events when promoted', () => {
    const { getByTestId } = render(
      <ExploreSearchResults
        searchQuery="TSLA"
        sections={baseSections()}
        onViewMore={jest.fn()}
      />,
    );

    expect(getByTestId('row-stocks').props.accessibilityLabel).toBe('true');

    fireEvent(getByTestId('trending-search-results-list'), 'touchMove');

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent.mock.calls[0][0].properties).toEqual(
      expect.objectContaining({
        interaction_type: 'scrolled',
        stocks_promoted: true,
      }),
    );
  });

  it('passes stocks_promoted=false when flag is off', () => {
    mockIsStocksPromotionEnabled = false;

    const { getByTestId } = render(
      <ExploreSearchResults
        searchQuery="TSLA"
        sections={baseSections()}
        onViewMore={jest.fn()}
      />,
    );

    expect(getByTestId('row-stocks').props.accessibilityLabel).toBe('false');
  });

  it('disables maintainVisibleContentPosition and resets scroll to 0 when section order changes with the same item count', () => {
    const threeStocks = [
      stockToken,
      { ...stockToken, assetId: 'eip155:1/erc20:0x333' },
      { ...stockToken, assetId: 'eip155:1/erc20:0x444' },
    ];

    const { rerender } = render(
      <ExploreSearchResults
        searchQuery="TSLA"
        sections={baseSections({ isLoading: true, items: [] })}
        onViewMore={jest.fn()}
      />,
    );

    expect(lastFlashListProps?.maintainVisibleContentPosition).toEqual({
      disabled: true,
    });
    mockScrollToOffset.mockClear();

    // Stocks finishes loading with 3 items (same flatData.length as 3 skeletons)
    // and gets promoted from index 2 -> index 0.
    rerender(
      <ExploreSearchResults
        searchQuery="TSLA"
        sections={baseSections({ isLoading: false, items: threeStocks })}
        onViewMore={jest.fn()}
      />,
    );

    expect(mockScrollToOffset).toHaveBeenCalledWith({
      offset: 0,
      animated: false,
    });
    mockScrollToOffset.mockClear();

    // Stocks is demoted back out of index 0 (e.g. flag toggled or loading starts)
    // with the same item count.
    rerender(
      <ExploreSearchResults
        searchQuery="TSLA"
        sections={baseSections({ isLoading: true, items: [] })}
        onViewMore={jest.fn()}
      />,
    );

    expect(mockScrollToOffset).toHaveBeenCalledWith({
      offset: 0,
      animated: false,
    });
  });

  it('uses distinct FlashList item types for the first header vs subsequent headers', () => {
    render(
      <ExploreSearchResults
        searchQuery="TSLA"
        sections={baseSections()}
        onViewMore={jest.fn()}
      />,
    );

    const getItemType = lastFlashListProps?.getItemType as (
      item: unknown,
    ) => string;
    expect(
      getItemType({
        type: 'header',
        feedId: 'stocks',
        title: 'Stocks',
        isFirstHeader: true,
      }),
    ).toBe('first-header');
    expect(
      getItemType({
        type: 'header',
        feedId: 'tokens',
        title: 'Crypto',
        isFirstHeader: false,
      }),
    ).toBe('header');
  });
});
