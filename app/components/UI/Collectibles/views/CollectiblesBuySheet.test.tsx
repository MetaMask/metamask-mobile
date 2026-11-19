import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { CollectiblesBuySheet } from './CollectiblesBuySheet';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({ params: { packCode: 'pack-1' } }),
}));

describe('CollectiblesBuySheet', () => {
  it('shows the placeholder title and the pack code from the route', () => {
    render(<CollectiblesBuySheet />);

    expect(
      screen.getByText(strings('collectibles.placeholder.buy')),
    ).toBeOnTheScreen();
    expect(screen.getByText('pack-1')).toBeOnTheScreen();
  });
});
