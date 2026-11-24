import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { CollectiblesLayout } from './CollectiblesLayout';

describe('CollectiblesLayout', () => {
  it('opens on the Collectibles home screen', () => {
    renderWithProvider(<CollectiblesLayout />);

    expect(screen.getByText(strings('collectibles.title'))).toBeOnTheScreen();
  });
});
