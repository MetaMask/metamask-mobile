import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { getHardwareTier } from '#app/util/deviceCapability';
import AnimatedCount from './AnimatedCount';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useReducedMotion: jest.fn(() => false),
  };
});

jest.mock('#app/util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'HIGH'),
}));

const mockUseReducedMotion = jest.mocked(useReducedMotion);
const mockGetHardwareTier = jest.mocked(getHardwareTier);

describe('AnimatedCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
    mockGetHardwareTier.mockReturnValue('HIGH');
  });

  it('handles the first value without animating on mount', () => {
    render(<AnimatedCount value={3} />);

    expect(screen.getByText('3').props.entering).toBeUndefined();
  });

  it('handles a changed value by animating the new digit', () => {
    const { rerender } = render(<AnimatedCount value={3} />);

    rerender(<AnimatedCount value={4} />);

    expect(screen.getByText('4').props.entering).toBeDefined();
  });

  it('handles reduced motion by keeping a changed value static', () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { rerender } = render(<AnimatedCount value={3} />);

    rerender(<AnimatedCount value={4} />);

    expect(screen.getByText('4').props.entering).toBeUndefined();
  });

  it('handles low-tier hardware by keeping a changed value static', () => {
    mockGetHardwareTier.mockReturnValue('LOW');
    const { rerender } = render(<AnimatedCount value={3} />);

    rerender(<AnimatedCount value={4} />);

    expect(screen.getByText('4').props.entering).toBeUndefined();
  });

  it('handles an unknown hardware tier by animating a changed value', () => {
    mockGetHardwareTier.mockReturnValue(null);
    const { rerender } = render(<AnimatedCount value={3} />);

    rerender(<AnimatedCount value={4} />);

    expect(screen.getByText('4').props.entering).toBeDefined();
  });
});
