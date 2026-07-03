import {
  computeSectionVisibleRatio,
  createSectionViewTracker,
  DEFAULT_DWELL_MS,
} from './sectionViewTracker';

describe('computeSectionVisibleRatio', () => {
  const viewportHeight = 800;

  it('returns 0 for a zero/negative height section', () => {
    expect(computeSectionVisibleRatio(0, 0, 0, viewportHeight)).toBe(0);
    expect(computeSectionVisibleRatio(0, -10, 0, viewportHeight)).toBe(0);
  });

  it('returns 0 when the viewport has no height yet', () => {
    expect(computeSectionVisibleRatio(0, 200, 0, 0)).toBe(0);
  });

  it('returns 1 when the section is fully within the viewport', () => {
    // Section [100, 300] fully inside viewport [0, 800].
    expect(computeSectionVisibleRatio(100, 200, 0, viewportHeight)).toBe(1);
  });

  it('returns 0 when the section is entirely below the viewport', () => {
    // Section starts at 900, viewport is [0, 800].
    expect(computeSectionVisibleRatio(900, 200, 0, viewportHeight)).toBe(0);
  });

  it('returns 0 when the section is entirely above the viewport', () => {
    // Viewport [1000, 1800]; section [0, 200] is above.
    expect(computeSectionVisibleRatio(0, 200, 1000, viewportHeight)).toBe(0);
  });

  it('returns the partially visible fraction', () => {
    // Section [700, 900] height 200; viewport [0, 800] => visible [700, 800] = 100/200.
    expect(computeSectionVisibleRatio(700, 200, 0, viewportHeight)).toBeCloseTo(
      0.5,
    );
  });

  it('uses min(height, viewportHeight) so a tall section can reach 1', () => {
    // Section taller than viewport, filling it entirely => ratio 1.
    expect(computeSectionVisibleRatio(0, 2000, 100, viewportHeight)).toBe(1);
  });
});

describe('createSectionViewTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const setup = () => {
    const onViewed = jest.fn();
    const tracker = createSectionViewTracker({ onViewed });
    return { onViewed, tracker };
  };

  it('does not fire before the viewport height is known', () => {
    const { onViewed, tracker } = setup();
    tracker.setLayout('trending', { top: 0, height: 400 });
    tracker.setScrollY(0);
    jest.advanceTimersByTime(DEFAULT_DWELL_MS);
    expect(onViewed).not.toHaveBeenCalled();
  });

  it('fires once after the dwell period when a section is visible', () => {
    const { onViewed, tracker } = setup();
    tracker.setViewportHeight(800);
    tracker.setLayout('trending', { top: 0, height: 400 });

    // Not yet — timer still pending.
    jest.advanceTimersByTime(DEFAULT_DWELL_MS - 1);
    expect(onViewed).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(onViewed).toHaveBeenCalledTimes(1);
    expect(onViewed).toHaveBeenCalledWith('trending');
  });

  it('does not fire on a fast scroll-past (section leaves before dwell completes)', () => {
    const { onViewed, tracker } = setup();
    tracker.setViewportHeight(800);
    tracker.setLayout('trending', { top: 0, height: 400 });

    // Visible, dwell starts...
    jest.advanceTimersByTime(200);
    // ...but user scrolls it out of view before 500ms.
    tracker.setScrollY(2000);
    jest.advanceTimersByTime(DEFAULT_DWELL_MS);

    expect(onViewed).not.toHaveBeenCalled();
  });

  it('fires only once even if it stays visible across further scrolls', () => {
    const { onViewed, tracker } = setup();
    tracker.setViewportHeight(800);
    tracker.setLayout('trending', { top: 0, height: 400 });

    jest.advanceTimersByTime(DEFAULT_DWELL_MS);
    expect(onViewed).toHaveBeenCalledTimes(1);

    tracker.setScrollY(10);
    jest.advanceTimersByTime(DEFAULT_DWELL_MS);
    expect(onViewed).toHaveBeenCalledTimes(1);
  });

  it('re-fires after reset (re-entering the home)', () => {
    const { onViewed, tracker } = setup();
    tracker.setViewportHeight(800);
    tracker.setLayout('trending', { top: 0, height: 400 });

    jest.advanceTimersByTime(DEFAULT_DWELL_MS);
    expect(onViewed).toHaveBeenCalledTimes(1);

    tracker.reset();
    // reset() calls evaluate() internally so already-visible sections restart
    // their dwell timers without needing a scroll event.
    jest.advanceTimersByTime(DEFAULT_DWELL_MS);
    expect(onViewed).toHaveBeenCalledTimes(2);
  });

  it('re-fires after reset even when scrollY stays at 0 (no scroll event)', () => {
    const { onViewed, tracker } = setup();
    tracker.setViewportHeight(800);
    // Section at top is immediately visible at scrollY=0.
    tracker.setLayout('live_now', { top: 0, height: 300 });

    jest.advanceTimersByTime(DEFAULT_DWELL_MS);
    expect(onViewed).toHaveBeenCalledTimes(1);

    // Simulate returning to the home at the same scroll position (scrollY=0).
    // No setScrollY call — reset must trigger evaluate() itself.
    tracker.reset();
    jest.advanceTimersByTime(DEFAULT_DWELL_MS);
    expect(onViewed).toHaveBeenCalledTimes(2);
  });

  it('tracks multiple sections independently', () => {
    const { onViewed, tracker } = setup();
    tracker.setViewportHeight(800);
    tracker.setLayout('live_now', { top: 0, height: 300 });
    tracker.setLayout('trending', { top: 2000, height: 400 });

    jest.advanceTimersByTime(DEFAULT_DWELL_MS);
    expect(onViewed).toHaveBeenCalledTimes(1);
    expect(onViewed).toHaveBeenCalledWith('live_now');

    // Scroll trending into view.
    tracker.setScrollY(2000);
    jest.advanceTimersByTime(DEFAULT_DWELL_MS);
    expect(onViewed).toHaveBeenCalledTimes(2);
    expect(onViewed).toHaveBeenLastCalledWith('trending');
  });

  it('cancels pending timers on destroy', () => {
    const { onViewed, tracker } = setup();
    tracker.setViewportHeight(800);
    tracker.setLayout('trending', { top: 0, height: 400 });

    tracker.destroy();
    jest.advanceTimersByTime(DEFAULT_DWELL_MS);
    expect(onViewed).not.toHaveBeenCalled();
  });
});
