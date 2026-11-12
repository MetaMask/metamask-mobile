import React from 'react';
import { AccessibilityInfo, AppState, Text as MockText } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { CollectiblesOpening } from '../../types';
import RecentOpeningsRow from './RecentOpeningsRow';
import {
  advanceOpeningArrival,
  initialOpeningArrival,
} from './recentOpeningArrival';

// Native OS motion/background callbacks are not available in the component-view renderer.
jest.mock('./DiscoveryCard', () => ({
  DiscoveryCard: ({
    card,
    arrival,
  }: {
    card: CollectiblesOpening;
    arrival?: { identity?: string; active: boolean };
  }) => (
    <MockText testID={card.id}>
      {arrival?.active ? arrival.identity : 'static'}
    </MockText>
  ),
}));

const opening = (id: string, openedAt: number): CollectiblesOpening => ({
  id,
  openedAt,
  mint: id,
  name: id,
});
const first = opening('first', 1000);
const next = opening('next', 2000);
const onPause = jest.fn();
const onResume = jest.fn();
const row = (cards = [first], active = true) => (
  <RecentOpeningsRow
    cards={cards}
    active={active}
    limit={8}
    onPause={onPause}
    onResume={onResume}
    onPress={jest.fn()}
  />
);
const ready = async () =>
  act(async () => {
    await Promise.resolve();
  });

// Select the boolean overload and the cleanup boundary consumed by the hook.
const motionEvents: {
  addEventListener: (
    event: 'reduceMotionChanged',
    listener: (reduced: boolean) => void,
  ) => Pick<ReturnType<typeof AccessibilityInfo.addEventListener>, 'remove'>;
} = AccessibilityInfo;

describe('Recent openings arrival lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
  });
  afterEach(() => jest.restoreAllMocks());

  it('animates only a newly inserted first real event and ignores stale history', async () => {
    const { rerender } = renderWithProvider(row());
    await ready();
    expect(screen.getByTestId('first')).toHaveTextContent('static');

    rerender(row([next, first]));

    await waitFor(() =>
      expect(screen.getByTestId('next')).toHaveTextContent('next'),
    );
    expect(screen.getByTestId('first')).toHaveTextContent('static');
    rerender(row([opening('older-unseen', 500), next, first]));
    expect(screen.getByTestId('older-unseen')).toHaveTextContent('static');
  });

  it('reports scrolling away from and returning to the start to the feed hook', async () => {
    renderWithProvider(row());
    await ready();
    const rail = screen.getByTestId('collectibles-recent-openings-row');

    fireEvent(rail, 'scrollBeginDrag');
    fireEvent(rail, 'scrollEndDrag', {
      nativeEvent: { contentOffset: { x: 80 } },
    });
    expect(onPause).toHaveBeenCalled();
    expect(onResume).not.toHaveBeenCalled();
    fireEvent(rail, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 0 } },
    });

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('cancels the arrival on blur without replaying events received while covered', async () => {
    const { rerender } = renderWithProvider(row());
    await ready();
    rerender(row([next, first]));
    expect(screen.getByTestId('next')).toHaveTextContent('next');

    rerender(row([next, first], false));
    rerender(row([opening('covered', 3000), next, first], false));
    rerender(row([opening('covered', 3000), next, first], true));

    expect(screen.getByTestId('covered')).toHaveTextContent('static');
    expect(screen.getByTestId('next')).toHaveTextContent('static');
  });

  it('cancels on background and removes OS subscriptions on unmount', async () => {
    const removeApp = jest.fn();
    const app = jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove: removeApp });
    const removeMotion = jest.fn();
    jest
      .spyOn(motionEvents, 'addEventListener')
      .mockReturnValue({ remove: removeMotion });
    const { rerender, unmount } = renderWithProvider(row());
    await ready();
    rerender(row([next, first]));

    act(() =>
      app.mock.calls.forEach(([event, listener]) => {
        if (event === 'change') listener('background');
      }),
    );

    expect(screen.getByTestId('next')).toHaveTextContent('static');
    act(() =>
      app.mock.calls.forEach(([event, listener]) => {
        if (event === 'change') listener('active');
      }),
    );
    expect(screen.getByTestId('next')).toHaveTextContent('static');
    unmount();
    expect(removeApp).toHaveBeenCalled();
    expect(removeMotion).toHaveBeenCalled();
  });

  it('responds to Reduce Motion during an arrival and does not replay it when restored', async () => {
    const motion = jest.spyOn(motionEvents, 'addEventListener');
    const { rerender } = renderWithProvider(row());
    await ready();
    rerender(row([next, first]));

    act(() =>
      motion.mock.calls.forEach(([event, listener]) => {
        if (event === 'reduceMotionChanged') listener(true);
      }),
    );

    expect(screen.getByTestId('next')).toHaveTextContent('static');
    act(() =>
      motion.mock.calls.forEach(([event, listener]) => {
        if (event === 'reduceMotionChanged') listener(false);
      }),
    );
    expect(screen.getByTestId('next')).toHaveTextContent('static');
  });

  it('deduplicates repeated snapshots and bounds presentation identities', () => {
    const initial = initialOpeningArrival([first]);
    const arrived = advanceOpeningArrival(initial, [next, first], true);

    expect(advanceOpeningArrival(arrived, [next, first], true)).toBe(arrived);
    const history = Array.from({ length: 200 }, (_, index) =>
      opening(`event-${index}`, index + 3000),
    );
    const bounded = advanceOpeningArrival(arrived, history, true);

    expect(bounded.knownIds).toHaveLength(100);
    expect(bounded.newestAt).toBe(3199);
  });
});
