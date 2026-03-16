/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { StyleSheet } from 'react-native';
import PerpsTransactionDetailAssetHero from './PerpsTransactionDetailAssetHero';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { RootState } from '../../../../../reducers';
import { PerpsTransactionSelectorsIDs } from '../../Perps.testIds';
import { FillType } from '../PerpsTransactionItem/PerpsTransactionItem';

// Mock PerpsTokenLogo
jest.mock('../PerpsTokenLogo', () => ({
  __esModule: true,
  default: ({ size, testID }: { size: number; testID?: string }) => {
    const { View } = jest.requireActual('react-native');
    return (
      <View
        testID={testID || 'perps-token-logo'}
        style={{ width: size, height: size }}
      />
    );
  },
}));

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
    fillType: FillType.Standard,
  },
};

describe('PerpsTransactionDetailAssetHero', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with PerpsTokenLogo component', () => {
    // Act
    const { getByTestId, getByText } = renderWithProvider(
      <PerpsTransactionDetailAssetHero
        transaction={mockTransaction}
        styles={mockStyles as any}
      />,
      {
        state: mockInitialState,
      },
    );

    // Assert
    expect(
      getByTestId(PerpsTransactionSelectorsIDs.TRANSACTION_DETAIL_ASSET_HERO),
    ).toBeOnTheScreen();
    expect(getByTestId('perps-token-logo')).toBeOnTheScreen();
    expect(getByText('1.5 ETH')).toBeOnTheScreen();
  });

  it('should display correct subtitle from transaction', () => {
    const customTransaction = {
      ...mockTransaction,
      subtitle: '2.75 BTC',
      fill: {
        ...mockTransaction.fill,
        fillType: FillType.Standard,
      },
    };

    // Act
    const { getByText } = renderWithProvider(
      <PerpsTransactionDetailAssetHero
        transaction={customTransaction}
        styles={mockStyles as any}
      />,
      {
        state: mockInitialState,
      },
    );

    // Assert
    expect(getByText('2.75 BTC')).toBeOnTheScreen();
  });

  it('should render PerpsTokenLogo with correct asset symbol', () => {
    const btcTransaction = {
      ...mockTransaction,
      asset: 'BTC',
      fill: {
        ...mockTransaction.fill,
        fillType: FillType.Standard,
      },
    };

    // Act
    const { getByTestId } = renderWithProvider(
      <PerpsTransactionDetailAssetHero
        transaction={btcTransaction}
        styles={mockStyles as any}
      />,
      {
        state: mockInitialState,
      },
    );

    // Assert - PerpsTokenLogo should be rendered (it handles asset metadata internally)
    expect(getByTestId('perps-token-logo')).toBeOnTheScreen();
  });

  it('should handle different asset types', () => {
    // Arrange
    const assets = ['ETH', 'BTC', 'SOL', 'MATIC'];

    // Act & Assert
    assets.forEach((asset) => {
      const assetTransaction = {
        ...mockTransaction,
        asset,
        subtitle: `1.0 ${asset}`,
      };

      const { getByText, getByTestId } = renderWithProvider(
        <PerpsTransactionDetailAssetHero
          transaction={assetTransaction}
          styles={mockStyles as any}
        />,
        {
          state: mockInitialState,
        },
      );

      expect(getByText(`1.0 ${asset}`)).toBeOnTheScreen();
      expect(getByTestId('perps-token-logo')).toBeOnTheScreen();
    });
  });
});
