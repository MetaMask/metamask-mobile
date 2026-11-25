import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { CollectiblesMarketView } from './CollectiblesMarketView';

describe('CollectiblesMarketView', () => {
  it('shows the coming soon placeholder', () => {
    renderWithProvider(<CollectiblesMarketView />);

    expect(
      screen.getByText(strings('collectibles.market.coming_soon')),
    ).toBeOnTheScreen();
  });
});
