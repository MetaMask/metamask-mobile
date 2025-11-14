import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import SectionCarrousel from './SectionCarrousel';
import type { PredictMarket } from '../../../../UI/Predict/types';

// Mock FlashList
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = jest.requireActual('react-native');
  return {
    FlashList: FlatList,
  };
});

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

// Mock Predict components
jest.mock(
  '../../../../UI/Predict/components/PredictMarket',
  () => 'PredictMarket',
);
jest.mock(
  '../../../../UI/Predict/components/PredictMarketSkeleton',
  () => 'PredictMarketSkeleton',
);

const initialState = {
  engine: {
    backgroundState,
  },
};

const createMockPredictMarket = (id: string, title: string): PredictMarket =>
  ({
    id,
    title,
    outcomes: [],
    status: 'active',
  }) as PredictMarket;

describe('SectionCarrousel', () => {
  const mockData: PredictMarket[] = [
    createMockPredictMarket('1', 'Market 1'),
    createMockPredictMarket('2', 'Market 2'),
    createMockPredictMarket('3', 'Market 3'),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders all items using section config renderItem', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel
          sectionId="predictions"
          isLoading={false}
          data={mockData}
        />,
        { state: initialState },
      );

      expect(getByTestId('carousel-flash-list')).toBeOnTheScreen();
    });

    it('renders pagination dots when showPagination is true', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel
          sectionId="predictions"
          isLoading={false}
          data={mockData}
          showPagination
          testIDPrefix="test-carousel"
        />,
        { state: initialState },
      );

      expect(getByTestId('test-carousel-pagination-dot-0')).toBeOnTheScreen();
      expect(getByTestId('test-carousel-pagination-dot-1')).toBeOnTheScreen();
      expect(getByTestId('test-carousel-pagination-dot-2')).toBeOnTheScreen();
    });

    it('hides pagination dots when showPagination is false', () => {
      const { queryByTestId } = renderWithProvider(
        <SectionCarrousel
          sectionId="predictions"
          isLoading={false}
          data={mockData}
          showPagination={false}
          testIDPrefix="test-carousel"
        />,
        { state: initialState },
      );

      expect(queryByTestId('test-carousel-pagination-dot-0')).toBeNull();
      expect(queryByTestId('test-carousel-pagination-dot-1')).toBeNull();
      expect(queryByTestId('test-carousel-pagination-dot-2')).toBeNull();
    });

    it('renders FlashList with correct testID prefix', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel
          sectionId="predictions"
          isLoading={false}
          data={mockData}
          testIDPrefix="custom-prefix"
        />,
        { state: initialState },
      );

      expect(getByTestId('custom-prefix-flash-list')).toBeOnTheScreen();
    });

    it('uses default testID prefix when not provided', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel
          sectionId="predictions"
          isLoading={false}
          data={mockData}
        />,
        { state: initialState },
      );

      expect(getByTestId('carousel-flash-list')).toBeOnTheScreen();
    });
  });

  describe('loading state', () => {
    it('renders skeleton items when isLoading is true', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel
          sectionId="predictions"
          isLoading
          data={[]}
          showPagination
          testIDPrefix="test-carousel"
        />,
        { state: initialState },
      );

      expect(getByTestId('carousel-flash-list')).toBeOnTheScreen();
      expect(getByTestId('test-carousel-pagination-dot-0')).toBeOnTheScreen();
      expect(getByTestId('test-carousel-pagination-dot-1')).toBeOnTheScreen();
      expect(getByTestId('test-carousel-pagination-dot-2')).toBeOnTheScreen();
    });

    it('renders actual data when isLoading is false', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel
          sectionId="predictions"
          isLoading={false}
          data={mockData}
        />,
        { state: initialState },
      );

      expect(getByTestId('carousel-flash-list')).toBeOnTheScreen();
    });
  });

  describe('pagination interaction', () => {
    it('renders pressable pagination dot without errors', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel
          sectionId="predictions"
          isLoading={false}
          data={mockData}
          showPagination
          testIDPrefix="test-carousel"
        />,
        { state: initialState },
      );

      const dot = getByTestId('test-carousel-pagination-dot-1');

      expect(dot).toBeOnTheScreen();
    });
  });

  describe('empty data', () => {
    it('renders without items when data is empty and not loading', () => {
      const { queryByTestId, getByTestId } = renderWithProvider(
        <SectionCarrousel
          sectionId="predictions"
          isLoading={false}
          data={[]}
          testIDPrefix="test-carousel"
        />,
        { state: initialState },
      );

      expect(getByTestId('carousel-flash-list')).toBeOnTheScreen();
      expect(queryByTestId('test-carousel-pagination-dot-0')).toBeNull();
    });
  });

  describe('single item', () => {
    it('renders pagination dot for single item', () => {
      const singleItem = [createMockPredictMarket('1', 'Single Market')];

      const { getByTestId } = renderWithProvider(
        <SectionCarrousel
          sectionId="predictions"
          isLoading={false}
          data={singleItem}
          showPagination
          testIDPrefix="test-carousel"
        />,
        { state: initialState },
      );

      expect(getByTestId('test-carousel-pagination-dot-0')).toBeOnTheScreen();
    });
  });

  describe('section configuration', () => {
    it('uses section config keyExtractor for items', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel
          sectionId="predictions"
          isLoading={false}
          data={mockData}
        />,
        { state: initialState },
      );

      expect(getByTestId('carousel-flash-list')).toBeOnTheScreen();
    });
  });
});
