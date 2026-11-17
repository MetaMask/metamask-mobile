import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PerpsMarketTileCardSkeleton from './PerpsMarketTileCardSkeleton';

describe('PerpsMarketTileCardSkeleton', () => {
  it('renders three card placeholders', () => {
    render(<PerpsMarketTileCardSkeleton />);

    expect(
      screen.getAllByTestId('perps-market-tile-card-skeleton'),
    ).toHaveLength(3);
  });
});
