import React, { ComponentType } from 'react';
import { fireEvent } from '@testing-library/react-native';
import PredictHomeFeaturedList from './PredictHomeFeaturedList';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';

// Type helper for UNSAFE_getByType with mocked string components
const asComponentType = (name: string) => name as unknown as ComponentType;

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks/usePredictMarketData', () => ({
  usePredictMarketData: jest.fn(),
}));

jest.mock('../PredictMarketRowItem', () => 'PredictMarketRowItem');
jest.mock('./PredictHomeSkeleton', () => 'PredictHomeSkeleton');

import { usePredictMarketData } from '../../hooks/usePredictMarketData';

const mockUsePredictMarketData = usePredictMarketData as jest.Mock;

const mockMarkets = [
  {
    id: 'market-1',
    title: 'Market 1',
    price: 0.5,
  },
  {
    id: 'market-2',
    title: 'Market 2',
    price: 0.75,
  },
];

describe('PredictHomeFeaturedList', () => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictMarketData.mockReturnValue({
      marketData: mockMarkets,
      isFetching: false,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders with default testID', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(<PredictHomeFeaturedList />, {
      state: initialState,
    });

    // Assert
    expect(getByTestId('predict-home-featured-list')).toBeOnTheScreen();
  });

  it('renders with custom testID', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(
      <PredictHomeFeaturedList testID="custom-test-id" />,
      {
        state: initialState,
      },
    );

    // Assert
    expect(getByTestId('custom-test-id')).toBeOnTheScreen();
  });

  it('renders trending header', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PredictHomeFeaturedList />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Trending')).toBeOnTheScreen();
  });

  it('renders market row items for each market', () => {
    // Arrange & Act
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PredictHomeFeaturedList />,
      {
        state: initialState,
      },
    );

    // Assert
    const marketItems = UNSAFE_getAllByType(
      asComponentType('PredictMarketRowItem'),
    );
    expect(marketItems).toHaveLength(mockMarkets.length);
  });

  it('passes correct entry point to market row items', () => {
    // Arrange & Act
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PredictHomeFeaturedList />,
      {
        state: initialState,
      },
    );

    // Assert
    const marketItems = UNSAFE_getAllByType(
      asComponentType('PredictMarketRowItem'),
    );
    marketItems.forEach((item) => {
      expect(item.props.entryPoint).toBe(
        PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED_LIST,
      );
    });
  });

  it('navigates to market list when header is pressed', () => {
    // Arrange
    const { getByTestId } = renderWithProvider(<PredictHomeFeaturedList />, {
      state: initialState,
    });
    const header = getByTestId('predict-home-featured-list-header');

    // Act
    fireEvent.press(header);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED_LIST,
      },
    });
  });

  it('renders skeleton when loading and no markets', () => {
    // Arrange
    mockUsePredictMarketData.mockReturnValue({
      marketData: [],
      isFetching: true,
    });

    // Act
    const { UNSAFE_getByType } = renderWithProvider(
      <PredictHomeFeaturedList />,
      {
        state: initialState,
      },
    );

    // Assert
    expect(
      UNSAFE_getByType(asComponentType('PredictHomeSkeleton')),
    ).toBeTruthy();
  });

  it('returns null when no markets and not loading', () => {
    // Arrange
    mockUsePredictMarketData.mockReturnValue({
      marketData: [],
      isFetching: false,
    });

    // Act
    const { queryByTestId } = renderWithProvider(<PredictHomeFeaturedList />, {
      state: initialState,
    });

    // Assert
    expect(queryByTestId('predict-home-featured-list')).toBeNull();
  });

  it('calls usePredictMarketData with trending category', () => {
    // Arrange & Act
    renderWithProvider(<PredictHomeFeaturedList />, {
      state: initialState,
    });

    // Assert
    expect(mockUsePredictMarketData).toHaveBeenCalledWith({
      category: 'trending',
      pageSize: 6,
    });
  });
});
