import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PredictPosition from './PredictPosition';
import type { Position } from '../../types';

const basePosition: Position = {
  providerId: 'polymarket',
  conditionId: 'cond-1',
  icon: 'https://example.com/icon.png',
  title: 'Will ETF be approved?',
  slug: 'etf-approved',
  size: 10,
  outcome: 'Yes',
  outcomeIndex: 0,
  cashPnl: 100,
  curPrice: 0.67,
  currentValue: 2345.67,
  percentPnl: 5.25,
  initialValue: 123.45,
  avgPrice: 0.34,
  redeemable: false,
  negativeRisk: false,
  endDate: '2025-12-31T00:00:00Z',
};

const renderComponent = (overrides?: Partial<Position>) => {
  const position: Position = { ...basePosition, ...overrides } as Position;
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
    { value: 0, expected: '+0%' },
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
