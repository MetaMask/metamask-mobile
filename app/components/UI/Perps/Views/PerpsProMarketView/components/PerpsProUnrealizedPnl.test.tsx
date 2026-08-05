import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { useSelector } from 'react-redux';
import PerpsProUnrealizedPnl from './PerpsProUnrealizedPnl';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

describe('PerpsProUnrealizedPnl', () => {
  const DOTS_SHORT = '•'.repeat(6);

  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockReturnValue(false);
  });

  it('renders aggregate PnL and close-all control', () => {
    render(
      <PerpsProUnrealizedPnl unrealizedPnl="150.5" returnOnEquity="12.3" />,
    );

    expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    expect(screen.getByText('+$150.50 (+12.3%)')).toBeOnTheScreen();
    expect(screen.getByText('Close all')).toBeOnTheScreen();
  });

  it('hides PnL value when privacy mode is enabled', () => {
    (useSelector as jest.Mock).mockReturnValue(true);

    render(
      <PerpsProUnrealizedPnl unrealizedPnl="150.5" returnOnEquity="12.3" />,
    );

    expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    expect(screen.queryByText('+$150.50 (+12.3%)')).toBeNull();
    expect(screen.getByText(DOTS_SHORT)).toBeOnTheScreen();
  });
});
