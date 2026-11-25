import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { MarketplaceView } from './MarketplaceView';

describe('MarketplaceView', () => {
  it('shows the coming soon placeholder', () => {
    renderWithProvider(<MarketplaceView />);

    expect(
      screen.getByText(strings('collectibles.marketplace.coming_soon')),
    ).toBeOnTheScreen();
  });
});
