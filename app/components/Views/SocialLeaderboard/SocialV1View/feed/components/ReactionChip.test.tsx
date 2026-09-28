import { screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import ReactionChip from './ReactionChip';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useReducedMotion: () => false,
  };
});

describe('ReactionChip', () => {
  it('renders the emotion and count', () => {
    renderWithProvider(
      <ReactionChip emotion="🐐" count={3} testID="reaction-chip-goat" />,
    );

    expect(screen.getByTestId('reaction-chip-goat')).toBeOnTheScreen();
    expect(screen.getByText('🐐')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  it('updates the count when engagement changes', () => {
    const { rerender } = renderWithProvider(
      <ReactionChip emotion="🔥" count={1} testID="reaction-chip-fire" />,
    );

    rerender(
      <ReactionChip emotion="🔥" count={9} testID="reaction-chip-fire" />,
    );

    expect(screen.getByText('9')).toBeOnTheScreen();
  });
});
