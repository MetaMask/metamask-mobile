import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WhatsHappeningExpandedCardSkeleton from './WhatsHappeningExpandedCardSkeleton';

describe('WhatsHappeningExpandedCardSkeleton', () => {
  it('renders for a given carousel card width', () => {
    renderWithProvider(<WhatsHappeningExpandedCardSkeleton cardWidth={320} />);
    expect(
      screen.getByTestId('whats-happening-expanded-card-skeleton'),
    ).toBeOnTheScreen();
  });
});
