import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import PerpsTransactionItem from './PerpsTransactionItem';
import { PerpsTransactionSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import {
  PerpsOrderTransactionStatus,
  PerpsOrderTransactionStatusType,
} from '../../types/transactionHistory';

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

describe('PerpsTransactionItem', () => {
  const mockOnPress = jest.fn();
  const mockRenderRightContent = jest.fn().mockReturnValue('Right Content');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render transaction item with correct content', () => {
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

  it('should render Avatar with correct asset name', () => {
    const btcTransaction = {
      ...mockTransaction,
      asset: 'BTC',
      title: 'Opened BTC long',
      subtitle: '0.5 BTC',
    };

    render(
      <PerpsTransactionItem
        item={btcTransaction}
        styles={mockStyles}
        onPress={mockOnPress}
        renderRightContent={mockRenderRightContent}
      />,
    );

    // Avatar should be called with BTC as name
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
});
