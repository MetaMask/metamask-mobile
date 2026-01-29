import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet, Linking } from 'react-native';
import PerpsTransactionItem, { FillType } from './PerpsTransactionItem';
import { PerpsTransactionSelectorsIDs } from '../../Perps.testIds';
import {
  PerpsOrderTransactionStatus,
  PerpsOrderTransactionStatusType,
} from '../../types/transactionHistory';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { PERPS_SUPPORT_ARTICLES_URLS } from '../../constants/perpsConfig';

// Mock Redux selector
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock the multichain accounts selector
jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

// Mock TagBase component
jest.mock('../../../../../component-library/base-components/TagBase', () => ({
  __esModule: true,
  default: ({
    children,
    severity,
  }: {
    children: React.ReactNode;
    severity: string;
  }) => {
    const { View } = jest.requireActual('react-native');
    return <View testID={`tag-base-${severity}`}>{children}</View>;
  },
  TagSeverity: {
    Default: 'default',
    Danger: 'danger',
    Info: 'info',
  },
  TagShape: {
    Pill: 'pill',
  },
}));

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

// Mock localization
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));

// Mock usePerpsEventTracking
jest.mock('../../hooks', () => ({
  usePerpsEventTracking: jest.fn(),
}));

const mockColors = {
  black: '#000000',
  gray: '#666666',
};

const mockStyles = StyleSheet.create({
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 72,
  },
  tokenIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionContent: {
    flex: 1,
  },
  transactionContentCentered: {
    flex: 1,
    justifyContent: 'center',
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: mockColors.black,
    marginBottom: 4,
  },
  transactionTitleCentered: {
    fontSize: 16,
    fontWeight: '400',
    color: mockColors.black,
    marginBottom: 0,
  },
  transactionSubtitle: {
    fontSize: 14,
    color: mockColors.gray,
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  fillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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

describe('PerpsTransactionItem', () => {
  const mockOnPress = jest.fn();
  const mockRenderRightContent = jest.fn().mockReturnValue('Right Content');
  const mockTrack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useSelector to return a function that returns the account
    // Pattern: useSelector(selectSelectedInternalAccountByScope)(EVM_SCOPE)
    const { useSelector } = jest.requireMock('react-redux');

    // useSelector should return a function that, when called with scope, returns the account
    useSelector.mockReturnValue(() => ({
      address: '0x123',
    }));

    // Mock usePerpsEventTracking hook
    const { usePerpsEventTracking } = jest.requireMock('../../hooks');
    usePerpsEventTracking.mockReturnValue({
      track: mockTrack,
    });
  });

  it('renders transaction item with correct content', () => {
    const { getByText, getByTestId } = render(
      <PerpsTransactionItem
        item={mockTransaction}
        styles={mockStyles}
        onPress={mockOnPress}
        renderRightContent={mockRenderRightContent}
      />,
    );

    expect(getByText('Opened ETH long')).toBeTruthy();
    expect(getByText('1.5 ETH')).toBeTruthy();
    expect(
      getByTestId(PerpsTransactionSelectorsIDs.TRANSACTION_ITEM_AVATAR),
    ).toBeTruthy();
    expect(getByTestId('perps-token-logo')).toBeTruthy();
    expect(mockRenderRightContent).toHaveBeenCalledWith(mockTransaction);
  });

  it('should call onPress when pressed', () => {
    const { getByTestId } = render(
      <PerpsTransactionItem
        item={mockTransaction}
        styles={mockStyles}
        onPress={mockOnPress}
        renderRightContent={mockRenderRightContent}
      />,
    );

    const touchable = getByTestId(
      PerpsTransactionSelectorsIDs.TRANSACTION_ITEM,
    );
    fireEvent.press(touchable);

    expect(mockOnPress).toHaveBeenCalledWith(mockTransaction);
  });

  it('should render with subtitle when provided', () => {
    const { getByText } = render(
      <PerpsTransactionItem
        item={mockTransaction}
        styles={mockStyles}
        onPress={mockOnPress}
        renderRightContent={mockRenderRightContent}
      />,
    );

    expect(getByText('1.5 ETH')).toBeTruthy();
  });

  it('should render without subtitle when empty', () => {
    const transactionWithoutSubtitle = {
      ...mockTransaction,
      subtitle: '',
    };

    const { queryByText } = render(
      <PerpsTransactionItem
        item={transactionWithoutSubtitle}
        styles={mockStyles}
        onPress={mockOnPress}
        renderRightContent={mockRenderRightContent}
      />,
    );

    expect(queryByText('1.5 ETH')).toBeFalsy();
  });

  it('should render PerpsTokenLogo with correct asset name', () => {
    const btcTransaction = {
      ...mockTransaction,
      asset: 'BTC',
      title: 'Opened BTC long',
      subtitle: '0.5 BTC',
    };

    const { getByTestId } = render(
      <PerpsTransactionItem
        item={btcTransaction}
        styles={mockStyles}
        onPress={mockOnPress}
        renderRightContent={mockRenderRightContent}
      />,
    );

    // PerpsTokenLogo should be rendered with BTC as symbol
    expect(getByTestId('perps-token-logo')).toBeTruthy();
    expect(mockRenderRightContent).toHaveBeenCalledWith(btcTransaction);
  });

  it('should handle different transaction types', () => {
    const orderTransaction = {
      ...mockTransaction,
      type: 'order' as const,
      category: 'limit_order' as const,
      title: 'Long limit order',
      fill: undefined,
      order: {
        text: PerpsOrderTransactionStatus.Filled,
        statusType: PerpsOrderTransactionStatusType.Filled,
        type: 'limit' as const,
        size: '1000',
        limitPrice: '2000',
        filled: '100%',
      },
    };

    const { getByText } = render(
      <PerpsTransactionItem
        item={orderTransaction}
        styles={mockStyles}
        onPress={mockOnPress}
        renderRightContent={mockRenderRightContent}
      />,
    );

    expect(getByText('Long limit order')).toBeTruthy();
    expect(mockRenderRightContent).toHaveBeenCalledWith(orderTransaction);
  });

  it('should handle funding transactions', () => {
    const fundingTransaction = {
      ...mockTransaction,
      type: 'funding' as const,
      category: 'funding_fee' as const,
      title: 'Received funding fee',
      subtitle: '',
      fill: undefined,
      fundingAmount: {
        isPositive: true,
        fee: '+$12.50',
        feeNumber: 12.5,
        rate: '0.01%',
      },
    };

    const { getByText } = render(
      <PerpsTransactionItem
        item={fundingTransaction}
        styles={mockStyles}
        onPress={mockOnPress}
        renderRightContent={mockRenderRightContent}
      />,
    );

    expect(getByText('Received funding fee')).toBeTruthy();
    expect(mockRenderRightContent).toHaveBeenCalledWith(fundingTransaction);
  });

  it('should handle long titles gracefully', () => {
    const longTitleTransaction = {
      ...mockTransaction,
      title: 'This is a very long transaction title that might overflow',
    };

    const { getByText } = render(
      <PerpsTransactionItem
        item={longTitleTransaction}
        styles={mockStyles}
        onPress={mockOnPress}
        renderRightContent={mockRenderRightContent}
      />,
    );

    expect(
      getByText('This is a very long transaction title that might overflow'),
    ).toBeTruthy();
  });

  it('should handle when renderRightContent returns null', () => {
    const mockRenderRightContentNull = jest.fn().mockReturnValue(null);

    const { getByText } = render(
      <PerpsTransactionItem
        item={mockTransaction}
        styles={mockStyles}
        onPress={mockOnPress}
        renderRightContent={mockRenderRightContentNull}
      />,
    );

    expect(getByText('Opened ETH long')).toBeTruthy();
    expect(mockRenderRightContentNull).toHaveBeenCalledWith(mockTransaction);
  });

  it('should handle special characters in titles and subtitles', () => {
    const specialCharTransaction = {
      ...mockTransaction,
      title: 'Closed ETH/USD-PERP long',
      subtitle: '1.5 ETH @ $2,000.50',
    };

    const { getByText } = render(
      <PerpsTransactionItem
        item={specialCharTransaction}
        styles={mockStyles}
        onPress={mockOnPress}
        renderRightContent={mockRenderRightContent}
      />,
    );

    expect(getByText('Closed ETH/USD-PERP long')).toBeTruthy();
    expect(getByText('1.5 ETH @ $2,000.50')).toBeTruthy();
  });

  it('should pass correct testID to TouchableOpacity', () => {
    const { getByTestId } = render(
      <PerpsTransactionItem
        item={mockTransaction}
        styles={mockStyles}
        onPress={mockOnPress}
        renderRightContent={mockRenderRightContent}
      />,
    );

    expect(
      getByTestId(PerpsTransactionSelectorsIDs.TRANSACTION_ITEM),
    ).toBeTruthy();
  });

  describe('Badge Display', () => {
    it('should display take profit badge for TP fills', () => {
      const tpTransaction = {
        ...mockTransaction,
        fill: {
          ...mockTransaction.fill,
          fillType: FillType.TakeProfit,
        },
      };

      const { getByText, getByTestId } = render(
        <PerpsTransactionItem
          item={tpTransaction}
          styles={mockStyles}
          onPress={mockOnPress}
          renderRightContent={mockRenderRightContent}
        />,
      );

      expect(getByText('perps.transactions.order.take_profit')).toBeTruthy();
      expect(getByTestId('tag-base-default')).toBeTruthy();
    });

    it('should display stop loss badge for SL fills', () => {
      const slTransaction = {
        ...mockTransaction,
        fill: {
          ...mockTransaction.fill,
          fillType: FillType.StopLoss,
        },
      };

      const { getByText, getByTestId } = render(
        <PerpsTransactionItem
          item={slTransaction}
          styles={mockStyles}
          onPress={mockOnPress}
          renderRightContent={mockRenderRightContent}
        />,
      );

      expect(getByText('perps.transactions.order.stop_loss')).toBeTruthy();
      expect(getByTestId('tag-base-default')).toBeTruthy();
    });

    it('should display liquidation badge for liquidated fills', () => {
      const liquidationTransaction = {
        id: 'test-tx-liquidation',
        type: 'trade' as const,
        category: 'position_close' as const,
        title: 'Closed ETH long',
        subtitle: '1.5 ETH',
        timestamp: 1640995200000,
        asset: 'ETH',
        fill: {
          shortTitle: 'Closed long',
          amount: '-$1000.00',
          amountNumber: -1000,
          isPositive: false,
          size: '1.5',
          entryPrice: '2000',
          points: '0',
          pnl: '-1000',
          fee: '5.00',
          feeToken: 'USDC',
          action: 'Closed',
          liquidation: {
            liquidatedUser: '0x123',
            markPx: '44900',
            method: 'market',
          },
          fillType: FillType.Liquidation,
        },
      };

      const { getByText, getByTestId } = render(
        <PerpsTransactionItem
          item={liquidationTransaction}
          styles={mockStyles}
          onPress={mockOnPress}
          renderRightContent={mockRenderRightContent}
        />,
      );

      expect(getByText('perps.transactions.order.liquidated')).toBeTruthy();
      expect(getByTestId('tag-base-danger')).toBeTruthy();
    });

    it('should display auto deleveraging badge for auto deleveraging fills', () => {
      const adlTransaction = {
        ...mockTransaction,
        fill: {
          ...mockTransaction.fill,
          fillType: FillType.AutoDeleveraging,
        },
      };

      const { getByText, getByTestId } = render(
        <PerpsTransactionItem
          item={adlTransaction}
          styles={mockStyles}
          onPress={mockOnPress}
          renderRightContent={mockRenderRightContent}
        />,
      );

      expect(
        getByText('perps.transactions.order.auto_deleveraging'),
      ).toBeTruthy();
      expect(getByTestId('tag-base-info')).toBeTruthy();
    });

    it('tracks event and opens support URL when ADL tag is pressed', () => {
      const adlTransaction = {
        ...mockTransaction,
        asset: 'BTC',
        timestamp: 1234567890000,
        fill: {
          ...mockTransaction.fill,
          fillType: FillType.AutoDeleveraging,
        },
      };

      const { getByText } = render(
        <PerpsTransactionItem
          item={adlTransaction}
          styles={mockStyles}
          onPress={mockOnPress}
          renderRightContent={mockRenderRightContent}
        />,
      );

      const adlTag = getByText('perps.transactions.order.auto_deleveraging');
      fireEvent.press(adlTag);

      expect(Linking.openURL).toHaveBeenCalledWith(
        PERPS_SUPPORT_ARTICLES_URLS.ADL_URL,
      );
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_UI_INTERACTION,
        {
          [PerpsEventProperties.INTERACTION_TYPE]:
            PerpsEventValues.INTERACTION_TYPE.TAP,
          [PerpsEventProperties.SCREEN_NAME]:
            PerpsEventValues.SCREEN_NAME.PERPS_ACTIVITY_HISTORY,
          [PerpsEventProperties.TAB_NAME]:
            PerpsEventValues.PERPS_HISTORY_TABS.TRADES,
          [PerpsEventProperties.ACTION_TYPE]:
            PerpsEventValues.ACTION_TYPE.ADL_LEARN_MORE,
          [PerpsEventProperties.ASSET]: 'BTC',
          [PerpsEventProperties.ORDER_TIMESTAMP]: 1234567890000,
        },
      );
    });

    it('should not display badge for regular fills', () => {
      const regularTransaction = {
        ...mockTransaction,
        fill: {
          ...mockTransaction.fill,
          fillType: FillType.Standard,
        },
      };

      const { queryByText, queryByTestId } = render(
        <PerpsTransactionItem
          item={regularTransaction}
          styles={mockStyles}
          onPress={mockOnPress}
          renderRightContent={mockRenderRightContent}
        />,
      );

      expect(queryByText('perps.transactions.order.take_profit')).toBeFalsy();
      expect(queryByText('perps.transactions.order.stop_loss')).toBeFalsy();
      expect(queryByText('perps.transactions.order.liquidated')).toBeFalsy();
      expect(queryByTestId(/tag-base/)).toBeFalsy();
    });

    it('should not display liquidation badge if liquidated user is different', () => {
      const otherUserLiquidation = {
        ...mockTransaction,
        fill: {
          ...mockTransaction.fill,
          fillType: FillType.Liquidation,
          liquidation: {
            liquidatedUser: '0x456', // Different user
            markPx: '44900',
            method: 'market',
          },
        },
      };

      const { queryByText } = render(
        <PerpsTransactionItem
          item={otherUserLiquidation}
          styles={mockStyles}
          onPress={mockOnPress}
          renderRightContent={mockRenderRightContent}
        />,
      );

      expect(queryByText('perps.transactions.order.liquidated')).toBeFalsy();
    });
  });
});
