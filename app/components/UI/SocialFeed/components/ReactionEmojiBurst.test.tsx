import { screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { getHardwareTier } from '../../../../util/deviceCapability';
import ReactionEmojiBurst, {
  createBurstParticles,
  REACTION_EMOJI_BURST_PARTICLE_TEST_ID,
  REACTION_EMOJI_BURST_TEST_ID,
} from './ReactionEmojiBurst';

const mockPrefersReducedMotion = jest.fn(() => false);

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useReducedMotion: () => mockPrefersReducedMotion(),
  };
});

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'HIGH'),
}));

const mockGetHardwareTier = jest.mocked(getHardwareTier);

describe('ReactionEmojiBurst', () => {
  beforeEach(() => {
    mockPrefersReducedMotion.mockReturnValue(false);
    mockGetHardwareTier.mockReturnValue('HIGH');
  });

  it('scatters four to seven copies of the reacted emoji', () => {
    renderWithProvider(
      <ReactionEmojiBurst
        emotion="🔥"
        originX={12}
        originY={18}
        onFinished={jest.fn()}
      />,
    );

    const particles = screen.getAllByTestId(
      REACTION_EMOJI_BURST_PARTICLE_TEST_ID,
      { includeHiddenElements: true },
    );
    expect(particles.length).toBeGreaterThanOrEqual(4);
    expect(particles.length).toBeLessThanOrEqual(7);
    expect(particles[0]).toHaveTextContent('🔥');
  });

  it('stays still when reduced motion is on', () => {
    mockPrefersReducedMotion.mockReturnValue(true);

    renderWithProvider(
      <ReactionEmojiBurst
        emotion="🔥"
        originX={12}
        originY={18}
        onFinished={jest.fn()}
      />,
    );

    expect(screen.queryByTestId(REACTION_EMOJI_BURST_TEST_ID)).toBeNull();
  });

  it('stays still on low-end hardware', () => {
    mockGetHardwareTier.mockReturnValue('LOW');

    renderWithProvider(
      <ReactionEmojiBurst
        emotion="🔥"
        originX={12}
        originY={18}
        onFinished={jest.fn()}
      />,
    );

    expect(screen.queryByTestId(REACTION_EMOJI_BURST_TEST_ID)).toBeNull();
  });
});

describe('createBurstParticles', () => {
  const sequence =
    (...values: number[]) =>
    () => {
      const next = values.shift();
      if (next == null) {
        throw new Error('random sequence ran out');
      }
      return next;
    };

  it('draws at most seven particles', () => {
    const particles = createBurstParticles(sequence(...Array(50).fill(0.99)));

    expect(particles).toHaveLength(7);
  });

  it('draws at least four particles and launches them together', () => {
    const particles = createBurstParticles(sequence(...Array(30).fill(0)));

    expect(particles).toHaveLength(4);
    expect(particles[0].duration).toBe(1000);
    expect(particles[0].delay).toBe(0);
    expect(particles[1].delay).toBe(0);
  });

  it('gives each particle its own path, size, and distance', () => {
    const particles = createBurstParticles(
      sequence(
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0.5,
        0.5,
        0.5,
        0.5,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ),
    );

    expect(particles).toHaveLength(4);
    expect(particles[0].delay).toBe(0);
    expect(particles[1].delay).toBe(0);
    expect(particles[0].endX).not.toBeCloseTo(particles[1].endX);
    expect(particles[0].scale).not.toBeCloseTo(particles[1].scale);
    expect(particles[0].duration).not.toBe(particles[1].duration);
  });
});
