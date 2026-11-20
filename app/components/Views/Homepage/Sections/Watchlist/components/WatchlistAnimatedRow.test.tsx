import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import WatchlistAnimatedRow, {
  WATCHLIST_ROW_ANIMATION_DURATION_MS,
} from './WatchlistAnimatedRow';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  FadeIn: {
    duration: jest.fn(() => 'fade-in-transition'),
  },
  FadeOut: {
    duration: jest.fn(() => 'fade-out-transition'),
  },
  LinearTransition: {
    duration: jest.fn(),
  },
  useReducedMotion: jest.fn(() => false),
}));

describe('WatchlistAnimatedRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .requireMock('react-native-reanimated')
      .useReducedMotion.mockReturnValue(false);
  });

  it('fades rows without animating their layout position', () => {
    render(
      <WatchlistAnimatedRow>
        <View testID="watchlist-row-content" />
      </WatchlistAnimatedRow>,
    );

    expect(
      jest.requireMock('react-native-reanimated').FadeIn.duration,
    ).toHaveBeenCalledWith(WATCHLIST_ROW_ANIMATION_DURATION_MS);
    expect(
      jest.requireMock('react-native-reanimated').FadeOut.duration,
    ).toHaveBeenCalledWith(WATCHLIST_ROW_ANIMATION_DURATION_MS);
    expect(
      jest.requireMock('react-native-reanimated').LinearTransition.duration,
    ).not.toHaveBeenCalled();
  });

  it('disables row transitions when Reduce Motion is enabled', () => {
    jest
      .requireMock('react-native-reanimated')
      .useReducedMotion.mockReturnValue(true);

    render(
      <WatchlistAnimatedRow>
        <View testID="watchlist-row-content" />
      </WatchlistAnimatedRow>,
    );

    expect(
      jest.requireMock('react-native-reanimated').FadeIn.duration,
    ).not.toHaveBeenCalled();
    expect(
      jest.requireMock('react-native-reanimated').FadeOut.duration,
    ).not.toHaveBeenCalled();
  });
});
