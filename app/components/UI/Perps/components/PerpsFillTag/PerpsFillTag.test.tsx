import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import PerpsFillTag from './PerpsFillTag';
import { FillType, PerpsTransaction } from '../../types/transactionHistory';
import { PERPS_SUPPORT_ARTICLES_URLS } from '../../constants/perpsConfig';

// Mock the hooks and dependencies
const mockUseSelector = jest.fn<() => { address: string } | null, [unknown]>(
  () => () => ({ address: '0xTestAddress' }),
);
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
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
    // Reset to default mock returning valid address
    mockUseSelector.mockImplementation(() => () => ({
      address: '0xTestAddress',
    }));
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

  it('renders ADL pill for AutoDeleveraging fill type', () => {
    const transaction = createMockTransaction(FillType.AutoDeleveraging);

    const { getByText } = render(<PerpsFillTag transaction={transaction} />);

    expect(getByText('Auto-Deleveraging')).toBeOnTheScreen();
  });

  it('opens ADL support article URL when ADL tag is pressed', () => {
    const transaction = createMockTransaction(FillType.AutoDeleveraging);
    const { getByText } = render(<PerpsFillTag transaction={transaction} />);

    fireEvent.press(getByText('Auto-Deleveraging'));

    expect(Linking.openURL).toHaveBeenCalledWith(
      PERPS_SUPPORT_ARTICLES_URLS.ADL_URL,
    );
  });

  it('tracks UI interaction event when ADL tag is pressed', () => {
    const transaction = createMockTransaction(FillType.AutoDeleveraging);
    const { getByText } = render(<PerpsFillTag transaction={transaction} />);

    fireEvent.press(getByText('Auto-Deleveraging'));

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

  it('does not render Liquidation pill when selectedAccount is null', () => {
    mockUseSelector.mockImplementation(
      () => () => null as unknown as { address: string },
    );
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

    const { toJSON } = render(<PerpsFillTag transaction={transaction} />);

    expect(toJSON()).toBeNull();
  });

  it('does not render Liquidation pill when both liquidatedUser and selectedAccount address are undefined', () => {
    // This tests the edge case where undefined === undefined would incorrectly return true
    mockUseSelector.mockImplementation(
      () => () => ({ address: undefined }) as unknown as { address: string },
    );
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
        // No liquidation object - liquidatedUser will be undefined
      },
    });

    const { toJSON } = render(<PerpsFillTag transaction={transaction} />);

    expect(toJSON()).toBeNull();
  });

  it('does not render Liquidation pill when liquidation object is missing', () => {
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
        // No liquidation object provided
      },
    });

    const { toJSON } = render(<PerpsFillTag transaction={transaction} />);

    expect(toJSON()).toBeNull();
  });
});
