import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import PerpsFillTag from './PerpsFillTag';
import { FillType, PerpsTransaction } from '../../types/transactionHistory';
import { PERPS_SUPPORT_ARTICLES_URLS } from '../../constants/perpsConfig';

// Mock the hooks and dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => () => ({ address: '0xTestAddress' })),
}));

const mockTrack = jest.fn();
jest.mock('../../hooks', () => ({
  usePerpsEventTracking: () => ({
    track: mockTrack,
  }),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));

const createMockTransaction = (
  fillType: FillType,
  overrides?: Partial<PerpsTransaction>,
): PerpsTransaction => ({
  id: 'test-id',
  type: 'trade',
  category: 'position_close',
  title: 'Closed long',
  subtitle: '1.5 ETH',
  timestamp: Date.now(),
  asset: 'ETH',
  fill: {
    shortTitle: 'Closed long',
    amount: '+$100',
    amountNumber: 100,
    isPositive: true,
    size: '1.5',
    entryPrice: '$2000',
    points: '100',
    pnl: '+$100',
    fee: '$1',
    action: 'close',
    feeToken: 'USDC',
    fillType,
  },
  ...overrides,
});

describe('PerpsFillTag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null for standard fill type', () => {
    const transaction = createMockTransaction(FillType.Standard);
    const { toJSON } = render(<PerpsFillTag transaction={transaction} />);
    expect(toJSON()).toBeNull();
  });

  it('renders null when no fill data', () => {
    const transaction: PerpsTransaction = {
      id: 'test-id',
      type: 'trade',
      category: 'position_close',
      title: 'Test',
      subtitle: 'Test',
      timestamp: Date.now(),
      asset: 'ETH',
    };
    const { toJSON } = render(<PerpsFillTag transaction={transaction} />);
    expect(toJSON()).toBeNull();
  });

  it('renders Take Profit pill', () => {
    const transaction = createMockTransaction(FillType.TakeProfit);
    const { getByText } = render(<PerpsFillTag transaction={transaction} />);
    expect(getByText('Take profit')).toBeOnTheScreen();
  });

  it('renders Stop Loss pill', () => {
    const transaction = createMockTransaction(FillType.StopLoss);
    const { getByText } = render(<PerpsFillTag transaction={transaction} />);
    expect(getByText('Stop loss')).toBeOnTheScreen();
  });

  it('renders ADL pill and opens URL on press', () => {
    const transaction = createMockTransaction(FillType.AutoDeleveraging);
    const { getByText } = render(<PerpsFillTag transaction={transaction} />);

    const adlTag = getByText('Auto-Deleveraging');
    expect(adlTag).toBeOnTheScreen();

    // Find and press the TouchableOpacity wrapping the tag
    fireEvent.press(adlTag);

    expect(Linking.openURL).toHaveBeenCalledWith(
      PERPS_SUPPORT_ARTICLES_URLS.ADL_URL,
    );
    expect(mockTrack).toHaveBeenCalled();
  });

  it('renders Liquidation pill when user is liquidated', () => {
    const transaction = createMockTransaction(FillType.Liquidation, {
      fill: {
        shortTitle: 'Closed long',
        amount: '-$100',
        amountNumber: -100,
        isPositive: false,
        size: '1.5',
        entryPrice: '$2000',
        points: '-100',
        pnl: '-$100',
        fee: '$1',
        action: 'close',
        feeToken: 'USDC',
        fillType: FillType.Liquidation,
        liquidation: {
          liquidatedUser: '0xTestAddress',
          markPx: '1800',
          method: 'market',
        },
      },
    });

    const { getByText } = render(<PerpsFillTag transaction={transaction} />);
    expect(getByText('Liquidated')).toBeOnTheScreen();
  });

  it('does not render Liquidation pill when user is not the liquidated user', () => {
    const transaction = createMockTransaction(FillType.Liquidation, {
      fill: {
        shortTitle: 'Closed long',
        amount: '-$100',
        amountNumber: -100,
        isPositive: false,
        size: '1.5',
        entryPrice: '$2000',
        points: '-100',
        pnl: '-$100',
        fee: '$1',
        action: 'close',
        feeToken: 'USDC',
        fillType: FillType.Liquidation,
        liquidation: {
          liquidatedUser: '0xOtherAddress',
          markPx: '1800',
          method: 'market',
        },
      },
    });

    const { toJSON } = render(<PerpsFillTag transaction={transaction} />);
    expect(toJSON()).toBeNull();
  });
});
