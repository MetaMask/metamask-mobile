import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PredictPositionResolved from './PredictPositionResolved';
import {
  PredictPositionStatus,
  type PredictPosition as PredictPositionType,
} from '../../types';

// Mock dayjs to return consistent relative time
jest.mock('dayjs', () => {
  const originalDayjs = jest.requireActual('dayjs');
  const mockDayjs = (date?: string | number | Date | undefined) => {
    if (date) {
      return {
        fromNow: () => '2 days ago',
        ...originalDayjs(date),
      };
    }
    return originalDayjs();
  };
  mockDayjs.extend = originalDayjs.extend;
  return mockDayjs;
});

const basePosition: PredictPositionType = {
  id: 'pos-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: '0',
  icon: 'https://example.com/icon.png',
  title: 'Will ETF be approved?',
  outcome: 'Yes',
  outcomeIndex: 0,
  amount: 10,
  price: 0.67,
  status: PredictPositionStatus.OPEN,
  size: 10,
  cashPnl: 100,
  percentPnl: 5.25,
  initialValue: 123.45,
  currentValue: 2345.67,
  avgPrice: 0.34,
  claimable: false,
  endDate: '2025-12-31T00:00:00Z',
};

const renderComponent = (overrides?: Partial<PredictPositionType>) => {
  const position: PredictPositionType = {
    ...basePosition,
    ...overrides,
  } as PredictPositionType;
  return render(<PredictPositionResolved position={position} />);
};

describe('PredictPositionResolved', () => {
  it('renders primary position info for winning position', () => {
    renderComponent();

    expect(screen.getByText(basePosition.title)).toBeOnTheScreen();
    expect(
      screen.getByText('$123.45 on Yes • Ended 2 days ago'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Won $2,345.67')).toBeOnTheScreen();
  });

  it('renders losing position correctly', () => {
    renderComponent({
      initialValue: 100,
      currentValue: 50,
      percentPnl: -50,
    });

    expect(
      screen.getByText('$100.00 on Yes • Ended 2 days ago'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Lost $50.00')).toBeOnTheScreen();
  });

  it('renders different outcome text', () => {
    renderComponent({ outcome: 'No' });

    expect(
      screen.getByText('$123.45 on No • Ended 2 days ago'),
    ).toBeOnTheScreen();
  });

  it('handles zero profit/loss correctly', () => {
    renderComponent({
      initialValue: 100,
      currentValue: 100,
      percentPnl: 0,
    });

    expect(screen.getByText('Lost $0.00')).toBeOnTheScreen();
  });

  it('calls onPress when position is tapped', () => {
    const mockOnPress = jest.fn();
    render(
      <PredictPositionResolved position={basePosition} onPress={mockOnPress} />,
    );

    const touchableElement = screen.getByText(basePosition.title);
    fireEvent.press(touchableElement);

    expect(mockOnPress).toHaveBeenCalledWith(basePosition);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not throw when onPress is not provided', () => {
    renderComponent();

    const touchableElement = screen.getByText(basePosition.title);
    // Should not throw when onPress is not provided
    expect(() => fireEvent.press(touchableElement)).not.toThrow();
  });
});
