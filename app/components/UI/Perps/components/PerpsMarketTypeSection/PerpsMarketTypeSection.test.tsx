import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import PerpsMarketTypeSection from './PerpsMarketTypeSection';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../PerpsMarketList', () => 'PerpsMarketList');
jest.mock('../PerpsRowSkeleton', () => 'PerpsRowSkeleton');

const mockMarkets = [
  {
    id: 'BTC-USD',
    symbol: 'BTC-USD',
    price: 50000,
    volume24h: 1000000,
  },
  {
    id: 'ETH-USD',
    symbol: 'ETH-USD',
    price: 3000,
    volume24h: 500000,
  },
];

describe('PerpsMarketTypeSection', () => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders section title', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(
      <PerpsMarketTypeSection
        title="Crypto"
        markets={mockMarkets}
        marketType="crypto"
      />,
      { state: initialState },
    );

    // Assert
    expect(getByText('Crypto')).toBeOnTheScreen();
  });

  it('renders PerpsMarketList with markets', () => {
    // Arrange & Act
    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsMarketTypeSection
        title="Crypto"
        markets={mockMarkets}
        marketType="crypto"
      />,
      { state: initialState },
    );

    // Assert
    const marketList = UNSAFE_getByType('PerpsMarketList');
    expect(marketList.props.markets).toEqual(mockMarkets);
  });

  it('renders skeleton when loading', () => {
    // Arrange & Act
    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsMarketTypeSection
        title="Crypto"
        markets={[]}
        marketType="crypto"
        isLoading
      />,
      { state: initialState },
    );

    // Assert
    const skeleton = UNSAFE_getByType('PerpsRowSkeleton');
    expect(skeleton.props.count).toBe(5);
  });

  it('returns null when markets array is empty and not loading', () => {
    // Arrange & Act
    const { queryByText } = renderWithProvider(
      <PerpsMarketTypeSection
        title="Crypto"
        markets={[]}
        marketType="crypto"
        isLoading={false}
      />,
      { state: initialState },
    );

    // Assert
    expect(queryByText('Crypto')).toBeNull();
  });

  it('navigates to market list when header is pressed', () => {
    // Arrange
    const { getByText } = renderWithProvider(
      <PerpsMarketTypeSection
        title="Crypto"
        markets={mockMarkets}
        marketType="crypto"
      />,
      { state: initialState },
    );
    const header = getByText('Crypto');

    // Act
    fireEvent.press(header);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        defaultMarketTypeFilter: 'crypto',
      },
    });
  });

  it('navigates to market details when market is pressed', () => {
    // Arrange
    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsMarketTypeSection
        title="Crypto"
        markets={mockMarkets}
        marketType="crypto"
      />,
      { state: initialState },
    );
    const marketList = UNSAFE_getByType('PerpsMarketList');

    // Act
    marketList.props.onMarketPress(mockMarkets[0]);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: { market: mockMarkets[0] },
    });
  });

  it('passes sortBy prop to PerpsMarketList', () => {
    // Arrange & Act
    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsMarketTypeSection
        title="Crypto"
        markets={mockMarkets}
        marketType="crypto"
        sortBy="price"
      />,
      { state: initialState },
    );

    // Assert
    const marketList = UNSAFE_getByType('PerpsMarketList');
    expect(marketList.props.sortBy).toBe('price');
  });

  it('uses default sortBy of volume', () => {
    // Arrange & Act
    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsMarketTypeSection
        title="Crypto"
        markets={mockMarkets}
        marketType="crypto"
      />,
      { state: initialState },
    );

    // Assert
    const marketList = UNSAFE_getByType('PerpsMarketList');
    expect(marketList.props.sortBy).toBe('volume');
  });

  it('applies custom testID to section', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(
      <PerpsMarketTypeSection
        title="Crypto"
        markets={mockMarkets}
        marketType="crypto"
        testID="custom-section-id"
      />,
      { state: initialState },
    );

    // Assert
    expect(getByTestId('custom-section-id')).toBeOnTheScreen();
  });
});
