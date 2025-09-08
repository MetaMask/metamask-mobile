import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PredictPosition from './PredictPosition';
import type { PredictPosition as PredictPositionType } from '../../types';

const basePosition: PredictPositionType = {
  id: 'pos-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: 0,
  conditionId: 'cond-1',
  icon: 'https://example.com/icon.png',
  title: 'Will ETF be approved?',
  outcome: 'Yes',
  outcomeIndex: 0,
  amount: 10,
  price: 0.67,
  status: 'open',
  size: 10,
  curPrice: 0.67,
  cashPnl: 100,
  percentPnl: 5.25,
  initialValue: 123.45,
  avgPrice: 0.34,
  currentValue: 2345.67,
  redeemable: false,
  endDate: '2025-12-31T00:00:00Z',
};

const renderComponent = (overrides?: Partial<PredictPositionType>) => {
  const position: PredictPositionType = {
    ...basePosition,
    ...overrides,
  } as PredictPositionType;
  return render(<PredictPosition position={position} />);
};

describe('PredictPosition', () => {
  it('renders primary position info', () => {
    renderComponent();

    expect(screen.getByText(basePosition.title)).toBeOnTheScreen();
    expect(screen.getByText('$123.45 on Yes • 34¢')).toBeOnTheScreen();
    expect(screen.getByText('$2,345.67')).toBeOnTheScreen();
    expect(screen.getByText('+5.25%')).toBeOnTheScreen();
  });

  it.each([
    { value: -3.5, expected: '-3.50%' },
    { value: 0, expected: '0%' },
    { value: 7.5, expected: '+7.50%' },
  ])('formats percentPnl $value as $expected', ({ value, expected }) => {
    renderComponent({ percentPnl: value });

    expect(screen.getByText(expected)).toBeOnTheScreen();
  });

  it('formats cents from avgPrice and initial value', () => {
    renderComponent({ initialValue: 50, outcome: 'No', avgPrice: 0.7 });

    expect(screen.getByText('$50.00 on No • 70¢')).toBeOnTheScreen();
  });
});
