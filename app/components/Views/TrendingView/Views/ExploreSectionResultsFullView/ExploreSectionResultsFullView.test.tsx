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
  sectionId: string;
  title: string;
  searchQuery: string;
  data: unknown[];
} = {
  sectionId: 'tokens',
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

jest.mock('../../sections.config', () => {
  const { View } = jest.requireActual('react-native');
  const MockRowItem = ({ item }: { item: unknown }) => (
    <View testID={`row-item-${(item as { assetId: string }).assetId}`} />
  );

  return {
    SECTIONS_CONFIG: {
      tokens: {
        id: 'tokens',
        title: 'Trending tokens',
        RowItem: MockRowItem,
        getItemIdentifier: (item: unknown) =>
          (item as { assetId: string }).assetId,
      },
    },
  };
});

jest.mock(
  '../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem',
  () => () => null,
);

describe('ExploreSectionResultsFullView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams.sectionId = 'tokens';
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
        interaction_type: 'view_all_item_clicked',
        search_query: 'bitcoin',
        section_name: 'Trending tokens',
        item_clicked: '1',
      }),
    );
    expect(mockAnalyticsTrackEvent).toHaveBeenCalled();
  });
});
