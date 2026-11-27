import React from 'react';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react-native';
import {
  toggleReaction,
  sortComments,
  type ProtoComment,
} from './commentsData';
import { RollingNumber, readNumber } from './RollingNumber';
import { OddsPill, smoothPath, smoothValues, targetDeltaLabel } from './feedUi';
import {
  formatVolume,
  parseVolume,
  stepVolume,
  useLiveEngagement,
  useLiveGame,
  useTickingPrice,
} from './simulation';
import { GAME_EVENTS, type ProtoGameEvent } from './fixtures';

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'HIGH',
}));
jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'FAST',
}));

describe('volume helpers', () => {
  it('parses and formats the Figma volume labels', () => {
    expect(parseVolume('$1.0M')).toBe(1_000_000);
    expect(parseVolume('$5.2M')).toBe(5_200_000);
    expect(parseVolume('$340K')).toBe(340_000);
    expect(parseVolume('nonsense')).toBe(0);
    expect(formatVolume(1_040_000)).toBe('$1.0M');
    expect(formatVolume(1_100_000)).toBe('$1.1M');
    expect(formatVolume(12_500)).toBe('$12.5K');
    expect(formatVolume(480)).toBe('$480');
  });

  it('only ever grows volume', () => {
    expect(stepVolume(1_000_000, 1_000_000, 0)).toBeGreaterThan(1_000_000);
    expect(stepVolume(1_000_000, 1_000_000, 1)).toBeGreaterThan(
      stepVolume(1_000_000, 1_000_000, 0),
    );
  });
});

describe('targetDeltaLabel', () => {
  it('labels which side of the target the price is on', () => {
    expect(targetDeltaLabel(91.75, 100)).toBe('−8.25% below target');
    expect(targetDeltaLabel(112.25, 100)).toBe('+12.25% above target');
    expect(targetDeltaLabel(100, 100)).toBe('At target');
    expect(targetDeltaLabel(100, 0)).toBe('At target');
  });
});

describe('chart curve helpers', () => {
  it('keeps the first and last price while smoothing the middle', () => {
    expect(smoothValues([1, 10, 1, 10, 1])).toEqual([1, 4, 7, 4, 1]);
    expect(smoothValues([5])).toEqual([5]);
  });

  it('builds a Bézier path through every point', () => {
    const path = smoothPath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ]);

    expect(path.startsWith('M0.0 10.0')).toBe(true);
    expect(path.match(/C/g)).toHaveLength(2);
    expect(path.endsWith('20.0 10.0')).toBe(true);
    expect(smoothPath([{ x: 0, y: 0 }])).toBe('');
  });
});

describe('live feed hooks', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps comments climbing and volume growing while live', () => {
    const { result } = renderHook(() =>
      useLiveEngagement({ volume: '$1.0M', comments: 393 }),
    );
    expect(result.current).toEqual({ volume: '$1.0M', comments: 393 });

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(result.current.comments).toBeGreaterThan(393);
    expect(parseVolume(result.current.volume)).toBeGreaterThan(1_000_000);
  });

  it('wiggles a price inside the odds band around its base', () => {
    const { result } = renderHook(() => useTickingPrice(50));
    const seen = new Set<number>();
    for (let tick = 0; tick < 40; tick++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      seen.add(result.current);
    }
    expect(seen.size).toBeGreaterThan(1);
    seen.forEach((price) => {
      expect(price).toBeGreaterThanOrEqual(42);
      expect(price).toBeLessThanOrEqual(58);
    });
  });

  it('runs the game clock in real time and replays after the final whistle', () => {
    const game = GAME_EVENTS.find(
      (event) => event.id === 'car-phi',
    ) as ProtoGameEvent;
    const { result } = renderHook(() =>
      useLiveGame(game, { realtime: true, replay: true }),
    );
    expect(result.current.feedClockLabel).toBe('Q4 02:19');
    expect(result.current.isFinalPeriod).toBe(true);

    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(result.current.feedClockLabel).toBe('Q4 02:09');

    act(() => {
      jest.advanceTimersByTime(130_000);
    });
    expect(result.current.isFinal).toBe(true);

    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(result.current.feedClockLabel).toBe('Q4 02:19');
    expect(result.current.isFinal).toBe(false);
  });
});

describe('OddsPill', () => {
  it('shows the price with its prefix and fires on press', () => {
    const onPress = jest.fn();
    render(
      <OddsPill
        tone="success"
        prefix="Up · "
        price={33}
        onPress={onPress}
        accessibilityLabel="Up, buy at 33 percent"
      />,
    );

    fireEvent.press(screen.getByLabelText('Up, buy at 33 percent'));

    expect(screen.getByText('Up · ')).toBeOnTheScreen();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('badges the pill with the contracts held, only when holding some', () => {
    const { rerender } = render(
      <OddsPill
        tone="success"
        price={33}
        badge={12}
        onPress={() => undefined}
        accessibilityLabel="Up"
      />,
    );
    expect(screen.getByTestId('position-badge')).toBeOnTheScreen();
    expect(screen.getByText('12')).toBeOnTheScreen();

    rerender(
      <OddsPill
        tone="success"
        price={33}
        onPress={() => undefined}
        accessibilityLabel="Up"
      />,
    );
    expect(screen.queryByTestId('position-badge')).not.toBeOnTheScreen();
  });
});

describe('comment helpers', () => {
  const base = (overrides: Partial<ProtoComment>): ProtoComment => ({
    id: 'c',
    author: {
      id: 'a',
      username: 'a',
      winRatePercent: null,
    },
    text: 'text',
    timestampMs: 0,
    reactions: [],
    userReaction: null,
    replies: [],
    ...overrides,
  });

  it('adds, switches and removes the viewer reaction', () => {
    const start = {
      reactions: [{ emotion: '🔥', count: 2 }],
      userReaction: null,
    };

    const added = toggleReaction(start, '🔥');
    expect(added).toEqual({
      reactions: [{ emotion: '🔥', count: 3 }],
      userReaction: '🔥',
    });

    const switched = toggleReaction(added, '👍');
    expect(switched.reactions).toEqual([
      { emotion: '🔥', count: 2 },
      { emotion: '👍', count: 1 },
    ]);
    expect(switched.userReaction).toBe('👍');

    const removed = toggleReaction(switched, '👍');
    expect(removed.reactions).toEqual([{ emotion: '🔥', count: 2 }]);
    expect(removed.userReaction).toBeNull();
  });

  it('sorts by reactions, recency, and holders only', () => {
    const quiet = base({ id: 'quiet', timestampMs: 300 });
    const loud = base({
      id: 'loud',
      timestampMs: 100,
      reactions: [{ emotion: '🔥', count: 9 }],
      side: { label: 'Yes', price: 60, isPositive: true },
    });
    const comments = [quiet, loud];

    expect(sortComments(comments, 'Top').map(({ id }) => id)).toEqual([
      'loud',
      'quiet',
    ]);
    expect(sortComments(comments, 'Newest').map(({ id }) => id)).toEqual([
      'quiet',
      'loud',
    ]);
    expect(sortComments(comments, 'Holders').map(({ id }) => id)).toEqual([
      'loud',
    ]);
  });
});

describe('RollingNumber', () => {
  it('reads direction from the number, ignoring separators', () => {
    expect(readNumber('02:19')).toBe(219);
    expect(readNumber('$1.0M')).toBe(1);
    expect(readNumber('393')).toBe(393);
    expect(readNumber('Final')).toBe(0);
  });

  it('keeps the full value as its accessible label while digits roll', () => {
    jest.useFakeTimers();
    const { rerender } = render(<RollingNumber value="33%" />);
    expect(screen.getByLabelText('33%')).toBeOnTheScreen();

    rerender(<RollingNumber value="34%" />);
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByLabelText('34%')).toBeOnTheScreen();
    jest.useRealTimers();
  });
});
