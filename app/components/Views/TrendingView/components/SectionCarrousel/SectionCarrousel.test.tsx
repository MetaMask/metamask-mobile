import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import SectionCarrousel from './SectionCarrousel';
import type { PredictMarket } from '../../../../UI/Predict/types';

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

  it('renders carousel with data items and pagination dots', () => {
    const { getByTestId } = renderWithProvider(
      <SectionCarrousel sectionId="predictions" />,
      { state: initialState },
    );

    expect(getByTestId('predictions-flash-list')).toBeOnTheScreen();
    expect(getByTestId('predictions-pagination-dot-0')).toBeOnTheScreen();
    expect(getByTestId('predictions-pagination-dot-1')).toBeOnTheScreen();
    expect(getByTestId('predictions-pagination-dot-2')).toBeOnTheScreen();
  });

  it('renders skeleton items with pagination when loading', () => {
    mockUsePredictMarketData.mockReturnValue({
      marketData: [],
      isFetching: true,
    });

    const { getByTestId } = renderWithProvider(
      <SectionCarrousel sectionId="predictions" />,
      { state: initialState },
    );

    expect(getByTestId('predictions-flash-list')).toBeOnTheScreen();
    expect(getByTestId('predictions-pagination-dot-0')).toBeOnTheScreen();
    expect(getByTestId('predictions-pagination-dot-1')).toBeOnTheScreen();
    expect(getByTestId('predictions-pagination-dot-2')).toBeOnTheScreen();
  });
});
