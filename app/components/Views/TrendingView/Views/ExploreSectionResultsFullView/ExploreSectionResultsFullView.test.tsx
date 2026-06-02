import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ExploreSectionResultsFullView from './ExploreSectionResultsFullView';
import { analytics } from '../../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockTokenData = [
  { assetId: '1', symbol: 'BTC', name: 'Bitcoin' },
  { assetId: '2', symbol: 'ETH', name: 'Ethereum' },
  { assetId: '3', symbol: 'SOL', name: 'Solana' },
  { assetId: '4', symbol: 'USDC', name: 'USD Coin' },
];

const mockRouteParams: {
  feedId: string;
  title: string;
  searchQuery: string;
  data: unknown[];
} = {
  feedId: 'tokens',
  title: 'Trending tokens',
  searchQuery: 'bitcoin',
  data: mockTokenData,
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

const mockBuild = jest.fn().mockReturnValue({});
const mockAddProperties = jest.fn().mockReturnThis();

jest.mock('../../../../../util/analytics/analytics', () => {
  const { createAnalyticsMockModule } = jest.requireActual(
    '../../../../../util/test/analyticsMock',
  );
  return createAnalyticsMockModule();
});

jest.mock('../../../../../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: jest.fn().mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    }),
  },
}));

const mockAnalyticsTrackEvent = analytics.trackEvent as jest.MockedFunction<
  typeof analytics.trackEvent
>;
const mockCreateEventBuilder =
  AnalyticsEventBuilder.createEventBuilder as jest.MockedFunction<
    typeof AnalyticsEventBuilder.createEventBuilder
  >;

// Replace the search row dispatcher with a stub that exposes the item id so
// taps on a specific row are testable.
jest.mock('../../search/SearchFeedRow', () => {
  const { View } = jest.requireActual('react-native');
  const TapView = jest.requireActual('../../search/TapView').default;
  return {
    __esModule: true,
    default: ({
      feedId,
      item,
      tabName,
      searchQuery,
      index,
    }: {
      feedId: string;
      item: { assetId: string };
      tabName: string;
      searchQuery: string;
      index: number;
    }) => {
      const { trackExploreSearchEvent } = jest.requireActual(
        '../../search/analytics',
      );
      return (
        <TapView
          onTap={() =>
            trackExploreSearchEvent({
              interaction_type: 'result_clicked',
              search_query: searchQuery,
              ...(tabName === 'all' ? { section_name: feedId } : {}),
              tab_name: tabName,
              item_clicked: item.assetId,
              position: index,
            })
          }
        >
          <View testID={`row-item-${item.assetId}`} />
        </TapView>
      );
    },
    SearchFeedSkeleton: () => <View testID="skeleton" />,
  };
});

describe('ExploreSectionResultsFullView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams.feedId = 'tokens';
    mockRouteParams.title = 'Trending tokens';
    mockRouteParams.searchQuery = 'bitcoin';
    mockRouteParams.data = mockTokenData;

    mockAddProperties.mockReturnThis();
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    } as never);
  });

  it('renders the title from route params', () => {
    const { getByText } = render(<ExploreSectionResultsFullView />);
    expect(getByText('Trending tokens')).toBeOnTheScreen();
  });

  it('navigates back when back button is pressed', () => {
    const { getByLabelText } = render(<ExploreSectionResultsFullView />);
    fireEvent.press(getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders all items from the section data', () => {
    const { getByTestId } = render(<ExploreSectionResultsFullView />);
    expect(getByTestId('row-item-1')).toBeOnTheScreen();
    expect(getByTestId('row-item-2')).toBeOnTheScreen();
    expect(getByTestId('row-item-3')).toBeOnTheScreen();
    expect(getByTestId('row-item-4')).toBeOnTheScreen();
  });

  it('renders empty list when section data is empty', () => {
    mockRouteParams.data = [];
    const { queryByTestId } = render(<ExploreSectionResultsFullView />);
    expect(queryByTestId('row-item-1')).toBeNull();
  });

  it('fires analytics event when an item is tapped', () => {
    const { getByTestId } = render(<ExploreSectionResultsFullView />);

    const item = getByTestId('row-item-1');
    fireEvent(item, 'touchStart', { nativeEvent: { pageY: 100 } });
    fireEvent(item, 'touchEnd', {});

    expect(mockCreateEventBuilder).toHaveBeenCalled();
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction_type: 'result_clicked',
        search_query: 'bitcoin',
        section_name: 'tokens',
        tab_name: 'all',
        item_clicked: '1',
        position: 0,
      }),
    );
    expect(mockAnalyticsTrackEvent).toHaveBeenCalled();
  });
});
