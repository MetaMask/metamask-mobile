import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { CollectiblesLayout } from './CollectiblesLayout';

describe('CollectiblesLayout', () => {
  it('opens on the Collectibles home screen', () => {
    renderWithProvider(<CollectiblesLayout />);

    expect(screen.getByText(strings('collectibles.title'))).toBeOnTheScreen();
  });

  it.each([
    ['packs', collectiblesTestIds.packsScreen],
    ['collection', collectiblesTestIds.collectionScreen],
    ['market', collectiblesTestIds.marketScreen],
  ])('opens the %s screen from its button', async (name, screenTestId) => {
    renderWithProvider(<CollectiblesLayout />);

    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.landingNavButton(name)),
    );

    expect(await screen.findByTestId(screenTestId)).toBeOnTheScreen();
  });
});
