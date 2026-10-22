import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { getHardwareTier } from '../../../../util/deviceCapability';
import ReactionChip from './ReactionChip';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useReducedMotion: () => false,
  };
});

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'HIGH'),
}));

const mockGetHardwareTier = jest.mocked(getHardwareTier);

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

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    renderWithProvider(
      <ReactionChip
        emotion="🔥"
        count={1}
        onPress={onPress}
        testID="reaction-chip-fire"
      />,
    );

    fireEvent.press(screen.getByTestId('reaction-chip-fire'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reports the selected state for the reader own reaction', () => {
    renderWithProvider(
      <ReactionChip
        emotion="🔥"
        count={1}
        isSelected
        testID="reaction-chip-fire"
      />,
    );

    expect(screen.getByTestId('reaction-chip-fire')).toHaveProp(
      'accessibilityState',
      { selected: true },
    );
  });

  it('defaults to unselected', () => {
    renderWithProvider(
      <ReactionChip emotion="🔥" count={1} testID="reaction-chip-fire" />,
    );

    expect(screen.getByTestId('reaction-chip-fire')).toHaveProp(
      'accessibilityState',
      { selected: false },
    );
  });

  it('still renders on low-tier hardware, where the pop animation is skipped', () => {
    mockGetHardwareTier.mockReturnValue('LOW');

    renderWithProvider(
      <ReactionChip emotion="🔥" count={4} testID="reaction-chip-fire" />,
    );

    expect(screen.getByText('4')).toBeOnTheScreen();
  });
});
