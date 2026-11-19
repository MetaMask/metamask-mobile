import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PerpsMarketTileCardSkeleton from './PerpsMarketTileCardSkeleton';
import { HomepagePerpsSelectorsIDs } from '../../../Homepage.testIds';

describe('PerpsMarketTileCardSkeleton', () => {
  it('renders three card placeholders', () => {
    render(<PerpsMarketTileCardSkeleton />);

    expect(
      screen.getAllByTestId(
        HomepagePerpsSelectorsIDs.MARKET_TILE_CARD_SKELETON,
      ),
    ).toHaveLength(3);
  });
});
