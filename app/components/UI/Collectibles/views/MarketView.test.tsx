import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { MarketView } from './MarketView';

describe('MarketView', () => {
  it('shows the coming soon placeholder', () => {
    renderWithProvider(<MarketView />);

    expect(
      screen.getByText(strings('collectibles.market.coming_soon')),
    ).toBeOnTheScreen();
  });
});
