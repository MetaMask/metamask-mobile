import React from 'react';
import { StyleSheet } from 'react-native';
import PerpsTransactionDetailAssetHero from './PerpsTransactionDetailAssetHero';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { RootState } from '../../../../../reducers';
import { PerpsTransactionSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

// Mock the hooks
jest.mock('../../hooks/usePerpsAssetsMetadata');

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};
const mockColors = {
  black: '#000000',
};

const mockStyles = StyleSheet.create({
  assetContainer: {
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  assetIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 36,
    marginBottom: 16,
  },
  assetIcon: {
    width: 44,
    height: 44,
    borderRadius: 36,
  },
  assetAmount: {
    fontWeight: '700',
    color: mockColors.black,
  },
});

const mockTransaction = {
  id: 'test-tx-1',
  type: 'trade' as const,
  category: 'position_open' as const,
  title: 'Opened ETH long',
  subtitle: '1.5 ETH',
  timestamp: 1640995200000,
  asset: 'ETH',
  fill: {
    shortTitle: 'Opened long',
    amount: '-$3000.00',
    amountNumber: -3000,
    isPositive: false,
    size: '1.5',
    entryPrice: '2000',
    points: '0',
    pnl: '0',
    fee: '5.00',
    feeToken: 'USDC',
    action: 'Opened',
    dir: 'long',
  },
};

describe('PerpsTransactionDetailAssetHero', () => {
  const mockUsePerpsAssetMetadata =
    usePerpsAssetMetadata as jest.MockedFunction<typeof usePerpsAssetMetadata>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with asset URL when available', () => {
    // Arrange
    const assetUrl = 'https://example.com/eth-icon.png';
    mockUsePerpsAssetMetadata.mockReturnValue({
      assetUrl,
      error: null,
      hasError: false,
    });

    // Act
    const { getByTestId, getByText } = renderWithProvider(
      <PerpsTransactionDetailAssetHero
        transaction={mockTransaction}
        styles={mockStyles}
      />,
      {
        state: mockInitialState,
      },
    );

    // Assert
    expect(
      getByTestId(PerpsTransactionSelectorsIDs.TRANSACTION_DETAIL_ASSET_HERO),
    ).toBeOnTheScreen();
    expect(getByText('1.5 ETH')).toBeOnTheScreen();
  });

  it('should render Avatar when asset URL is not available', () => {
    // Arrange
    mockUsePerpsAssetMetadata.mockReturnValue({
      assetUrl: '',
      error: null,
      hasError: false,
    });

    // Act
    const { getByTestId, getByText } = renderWithProvider(
      <PerpsTransactionDetailAssetHero
        transaction={mockTransaction}
        styles={mockStyles}
      />,
      {
        state: mockInitialState,
      },
    );

    // Assert
    expect(
      getByTestId(PerpsTransactionSelectorsIDs.ASSET_ICON_CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('1.5 ETH')).toBeOnTheScreen();
  });

  it('should render Avatar when asset URL is empty string', () => {
    // Arrange
    mockUsePerpsAssetMetadata.mockReturnValue({
      assetUrl: '',
      error: null,
      hasError: false,
    });

    // Act
    const { getByTestId } = renderWithProvider(
      <PerpsTransactionDetailAssetHero
        transaction={mockTransaction}
        styles={mockStyles}
      />,
      {
        state: mockInitialState,
      },
    );

    // Assert
    expect(
      getByTestId(PerpsTransactionSelectorsIDs.ASSET_ICON_CONTAINER),
    ).toBeOnTheScreen();
  });

  it('should display correct subtitle from transaction', () => {
    // Arrange
    mockUsePerpsAssetMetadata.mockReturnValue({
      assetUrl: 'https://example.com/eth-icon.png',
      error: null,
      hasError: false,
    });

    const customTransaction = {
      ...mockTransaction,
      subtitle: '2.75 BTC',
    };

    // Act
    const { getByText } = renderWithProvider(
      <PerpsTransactionDetailAssetHero
        transaction={customTransaction}
        styles={mockStyles}
      />,
      {
        state: mockInitialState,
      },
    );

    // Assert
    expect(getByText('2.75 BTC')).toBeOnTheScreen();
  });

  it('should call usePerpsAssetMetadata with correct asset', () => {
    // Arrange
    mockUsePerpsAssetMetadata.mockReturnValue({
      assetUrl: '',
      error: null,
      hasError: false,
    });

    const btcTransaction = {
      ...mockTransaction,
      asset: 'BTC',
    };

    // Act
    renderWithProvider(
      <PerpsTransactionDetailAssetHero
        transaction={btcTransaction}
        styles={mockStyles}
      />,
      {
        state: mockInitialState,
      },
    );

    // Assert
    expect(mockUsePerpsAssetMetadata).toHaveBeenCalledWith('BTC');
  });

  it('should handle different asset types', () => {
    // Arrange
    const assets = ['ETH', 'BTC', 'SOL', 'MATIC'];

    // Act & Assert
    assets.forEach((asset) => {
      mockUsePerpsAssetMetadata.mockReturnValue({
        assetUrl: `https://example.com/${asset.toLowerCase()}-icon.png`,
        error: null,
        hasError: false,
      });

      const assetTransaction = {
        ...mockTransaction,
        asset,
        subtitle: `1.0 ${asset}`,
      };

      const { getByText } = renderWithProvider(
        <PerpsTransactionDetailAssetHero
          transaction={assetTransaction}
          styles={mockStyles}
        />,
        {
          state: mockInitialState,
        },
      );

      expect(getByText(`1.0 ${asset}`)).toBeOnTheScreen();
      expect(mockUsePerpsAssetMetadata).toHaveBeenCalledWith(asset);
    });
  });

  it('should handle undefined asset metadata gracefully', () => {
    // Arrange
    mockUsePerpsAssetMetadata.mockReturnValue({
      assetUrl: '',
      error: null,
      hasError: false,
    });

    // Act
    const { getByTestId } = renderWithProvider(
      <PerpsTransactionDetailAssetHero
        transaction={mockTransaction}
        styles={mockStyles}
      />,
      {
        state: mockInitialState,
      },
    );

    // Assert
    expect(
      getByTestId(PerpsTransactionSelectorsIDs.ASSET_ICON_CONTAINER),
    ).toBeOnTheScreen();
  });
});
