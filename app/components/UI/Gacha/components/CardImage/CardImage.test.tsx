import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { GachaCardImageTestIds } from '../../Gacha.testIds';
import CardImage from './CardImage';

const URI = 'https://example.com/card.png';

describe('CardImage', () => {
  it('shows a skeleton until the image is loaded', async () => {
    renderWithProvider(<CardImage uri={URI} />);

    expect(
      screen.getByTestId(GachaCardImageTestIds.SKELETON),
    ).toBeOnTheScreen();
    await waitFor(() =>
      expect(
        screen.queryByTestId(GachaCardImageTestIds.SKELETON),
      ).not.toBeOnTheScreen(),
    );
    expect(screen.getByTestId(GachaCardImageTestIds.IMAGE)).toBeOnTheScreen();
  });

  it('shows the fallback when the image fails to load', async () => {
    renderWithProvider(<CardImage uri={URI} />);

    fireEvent(screen.getByTestId(GachaCardImageTestIds.IMAGE), 'error');

    expect(
      await screen.findByTestId(GachaCardImageTestIds.FALLBACK),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaCardImageTestIds.IMAGE),
    ).not.toBeOnTheScreen();
  });

  it('shows the fallback without an image URL', () => {
    renderWithProvider(<CardImage />);

    expect(
      screen.getByTestId(GachaCardImageTestIds.FALLBACK),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaCardImageTestIds.SKELETON),
    ).not.toBeOnTheScreen();
  });
});
