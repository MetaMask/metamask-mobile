import React from 'react';
import { screen } from '@testing-library/react-native';
import render from '#app/util/test/renderWithProvider';
import { ArtworkFallback } from '#app/components/UI/Collectibles/components/ArtworkFallback';

describe('ArtworkFallback', () => {
  it('renders the missing artwork surface', () => {
    render(<ArtworkFallback testID="artwork-fallback" />);

    expect(screen.getByTestId('artwork-fallback')).toBeOnTheScreen();
  });
});
