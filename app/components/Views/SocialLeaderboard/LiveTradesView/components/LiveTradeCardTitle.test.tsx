import { screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import LiveTradeCardTitle from './LiveTradeCardTitle';

describe('LiveTradeCardTitle', () => {
  it('renders a spot buy as symbol and side', () => {
    renderWithProvider(<LiveTradeCardTitle symbol="AMD" side="buy" />);

    expect(screen.getByText('AMD')).toBeOnTheScreen();
    expect(screen.getByText('Buy')).toBeOnTheScreen();
  });

  it('renders a spot sell as symbol and side', () => {
    renderWithProvider(<LiveTradeCardTitle symbol="SOL" side="sell" />);

    expect(screen.getByText('Sell')).toBeOnTheScreen();
  });

  it('prepends the leverage to a perp direction', () => {
    renderWithProvider(
      <LiveTradeCardTitle
        symbol="HYPE"
        direction="short"
        leverageLabel="15x"
      />,
    );

    expect(screen.getByText('15x Short')).toBeOnTheScreen();
  });

  it('renders the direction alone when the trade reports no leverage', () => {
    renderWithProvider(<LiveTradeCardTitle symbol="ETH" direction="long" />);

    expect(screen.getByText('Long')).toBeOnTheScreen();
  });

  it('renders only the symbol when neither side nor direction is known', () => {
    renderWithProvider(<LiveTradeCardTitle symbol="PEPE" />);

    expect(screen.getByText('PEPE')).toBeOnTheScreen();
    expect(screen.queryByText('Buy')).toBeNull();
    expect(screen.queryByText('Long')).toBeNull();
  });
});
