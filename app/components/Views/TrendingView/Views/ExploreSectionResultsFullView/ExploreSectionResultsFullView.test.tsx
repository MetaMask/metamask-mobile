import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ExploreSectionResultsFullView from './ExploreSectionResultsFullView';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockRouteParams = {
  sectionId: 'tokens' as const,
  title: 'Trending tokens',
  searchQuery: 'bitcoin',
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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const mockTokenData = [
  { assetId: '1', symbol: 'BTC', name: 'Bitcoin' },
  { assetId: '2', symbol: 'ETH', name: 'Ethereum' },
  { assetId: '3', symbol: 'SOL', name: 'Solana' },
  { assetId: '4', symbol: 'USDC', name: 'USD Coin' },
];

let mockSectionData = mockTokenData;
let mockIsLoading = false;

jest.mock('../../sections.config', () => {
  const { View } = jest.requireActual('react-native');
  const MockRowItem = ({ item }: { item: unknown }) => (
    <View testID={`row-item-${(item as { assetId: string }).assetId}`} />
  );
  const MockSkeleton = () => <View testID="skeleton" />;

  return {
    SECTIONS_CONFIG: {
      tokens: {
        id: 'tokens',
        title: 'Trending tokens',
        RowItem: MockRowItem,
        Skeleton: MockSkeleton,
        useSectionData: (searchQuery?: string) => ({
          data: searchQuery !== undefined ? mockSectionData : mockSectionData,
          isLoading: mockIsLoading,
          refetch: jest.fn(),
        }),
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
    mockSectionData = mockTokenData;
    mockIsLoading = false;
    mockRouteParams.sectionId = 'tokens';
    mockRouteParams.title = 'Trending tokens';
    mockRouteParams.searchQuery = 'bitcoin';
  });

  it('renders the title from route params', () => {
    const { getByText } = render(<ExploreSectionResultsFullView />);

    expect(getByText('Trending tokens')).toBeDefined();
  });

  it('navigates back when back button is pressed', () => {
    const { getByLabelText } = render(<ExploreSectionResultsFullView />);

    fireEvent.press(getByLabelText('Go back'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders skeletons when loading', () => {
    mockIsLoading = true;

    const { getAllByTestId } = render(<ExploreSectionResultsFullView />);

    expect(getAllByTestId('skeleton').length).toBe(10);
  });

  it('renders all items from the section data', () => {
    const { getByTestId } = render(<ExploreSectionResultsFullView />);

    expect(getByTestId('row-item-1')).toBeDefined();
    expect(getByTestId('row-item-2')).toBeDefined();
    expect(getByTestId('row-item-3')).toBeDefined();
    expect(getByTestId('row-item-4')).toBeDefined();
  });

  it('renders empty list when section data is empty', () => {
    mockSectionData = [];

    const { queryByTestId } = render(<ExploreSectionResultsFullView />);

    expect(queryByTestId('row-item-1')).toBeNull();
  });
});
