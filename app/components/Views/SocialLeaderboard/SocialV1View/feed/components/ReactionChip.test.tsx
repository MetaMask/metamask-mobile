import { screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import ReactionChip from './ReactionChip';

describe('ReactionChip', () => {
  it('renders the emotion and count', () => {
    renderWithProvider(
      <ReactionChip emotion="🐐" count={3} testID="reaction-chip-goat" />,
    );

    expect(screen.getByTestId('reaction-chip-goat')).toBeOnTheScreen();
    expect(screen.getByText('🐐')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
  });
});
