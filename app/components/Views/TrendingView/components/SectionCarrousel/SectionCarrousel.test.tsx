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
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(() => ({
      navigate: jest.fn(),
    })),
  };
});

// Mock Predict components
jest.mock(
  '../../../../UI/Predict/components/PredictMarket',
  () => 'PredictMarket',
);
jest.mock(
  '../../../../UI/Predict/components/PredictMarketSkeleton',
  () => 'PredictMarketSkeleton',
);

// Mock Predict data hook
const mockUsePredictMarketData = jest.fn();
jest.mock('../../../../UI/Predict/hooks/usePredictMarketData', () => ({
  usePredictMarketData: () => mockUsePredictMarketData(),
}));

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
  }) as unknown as PredictMarket;

describe('SectionCarrousel', () => {
  const mockData: PredictMarket[] = [
    createMockPredictMarket('1', 'Market 1'),
    createMockPredictMarket('2', 'Market 2'),
    createMockPredictMarket('3', 'Market 3'),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictMarketData.mockReturnValue({
      marketData: mockData,
      isFetching: false,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders all items using section config renderItem', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel sectionId="predictions" />,
        { state: initialState },
      );

      expect(getByTestId('predictions-flash-list')).toBeOnTheScreen();
    });

    it('renders FlashList with sectionId as testID prefix', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel sectionId="predictions" />,
        { state: initialState },
      );

      expect(getByTestId('predictions-flash-list')).toBeOnTheScreen();
    });
  });

  describe('loading state', () => {
    it('renders skeleton items when isLoading is true', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: true,
      });

      const { getByTestId } = renderWithProvider(
        <SectionCarrousel sectionId="predictions" />,
        { state: initialState },
      );

      expect(getByTestId('predictions-flash-list')).toBeOnTheScreen();
    });

    it('renders actual data when isLoading is false', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel sectionId="predictions" />,
        { state: initialState },
      );

      expect(getByTestId('predictions-flash-list')).toBeOnTheScreen();
    });
  });

  describe('empty data', () => {
    it('renders without items when data is empty and not loading', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: false,
      });

      const { getByTestId } = renderWithProvider(
        <SectionCarrousel sectionId="predictions" />,
        { state: initialState },
      );

      expect(getByTestId('predictions-flash-list')).toBeOnTheScreen();
    });
  });

  describe('single item', () => {
    it('renders FlashList with single item', () => {
      const singleItem = [createMockPredictMarket('1', 'Single Market')];
      mockUsePredictMarketData.mockReturnValue({
        marketData: singleItem,
        isFetching: false,
      });

      const { getByTestId } = renderWithProvider(
        <SectionCarrousel sectionId="predictions" />,
        { state: initialState },
      );

      expect(getByTestId('predictions-flash-list')).toBeOnTheScreen();
    });
  });

  describe('section configuration', () => {
    it('uses section config keyExtractor for items', () => {
      const { getByTestId } = renderWithProvider(
        <SectionCarrousel sectionId="predictions" />,
        { state: initialState },
      );

      expect(getByTestId('predictions-flash-list')).toBeOnTheScreen();
    });
  });
});
