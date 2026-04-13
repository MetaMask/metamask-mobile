import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PositionRow from './PositionRow';
import type { Position } from '@metamask/social-controllers';

const basePosition: Position = {
  tokenSymbol: 'STARKBOT',
  tokenName: 'Starkbot',
  tokenAddress: '0x123',
  chain: 'base',
  positionAmount: 1500000000,
  boughtUsd: 1200,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 1200,
  trades: [],
  lastTradeAt: Date.now(),
  currentValueUSD: 2259.96,
  pnlValueUsd: 1059.96,
  pnlPercent: 182,
};

describe('PositionRow', () => {
  it('renders the container with the expected testID', () => {
    const { getByTestId } = render(<PositionRow position={basePosition} />);
    expect(getByTestId('position-row-STARKBOT')).toBeOnTheScreen();
  });

  it('displays the token symbol', () => {
    const { getAllByText } = render(<PositionRow position={basePosition} />);
    // tokenSymbol appears in the name row and in the amount row
    expect(getAllByText('STARKBOT').length).toBeGreaterThanOrEqual(1);
  });

  it('displays the formatted USD value', () => {
    const { getByText } = render(<PositionRow position={basePosition} />);
    expect(getByText('$2,259.96')).toBeOnTheScreen();
  });

  it('displays PnL with a + prefix for a positive percent', () => {
    const { getByText } = render(<PositionRow position={basePosition} />);
    expect(getByText('+182%')).toBeOnTheScreen();
  });

  it('displays PnL without a + prefix for a negative percent', () => {
    const position = { ...basePosition, pnlPercent: -50 };
    const { getByText } = render(<PositionRow position={position} />);
    expect(getByText('-50%')).toBeOnTheScreen();
  });

  it('displays PnL as 0% when pnlPercent is 0', () => {
    const position = { ...basePosition, pnlPercent: 0 };
    const { getByText } = render(<PositionRow position={position} />);
    expect(getByText('+0%')).toBeOnTheScreen();
  });

  it('shows an em-dash when currentValueUSD is null', () => {
    const position = { ...basePosition, currentValueUSD: null };
    const { getAllByText } = render(<PositionRow position={position} />);
    expect(getAllByText('\u2014').length).toBeGreaterThanOrEqual(1);
  });

  it('shows an em-dash when pnlPercent is null', () => {
    const position = { ...basePosition, pnlPercent: null };
    const { getAllByText } = render(<PositionRow position={position} />);
    expect(getAllByText('\u2014').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onPress with the position object when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PositionRow position={basePosition} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('position-row-STARKBOT'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(basePosition);
  });

  it('renders without crashing when onPress is not provided', () => {
    const { getByTestId } = render(<PositionRow position={basePosition} />);
    expect(getByTestId('position-row-STARKBOT')).toBeOnTheScreen();
  });

  it('uses the tokenSymbol for the testID', () => {
    const position = { ...basePosition, tokenSymbol: 'PEPE' };
    const { getByTestId } = render(<PositionRow position={position} />);
    expect(getByTestId('position-row-PEPE')).toBeOnTheScreen();
  });
});
