import React from 'react';
import { act, render } from '@testing-library/react-native';
import SlidingTextCarousel, { ROTATE_INTERVAL_MS } from './SlidingTextCarousel';

// withTiming in the Reanimated mock calls its callback synchronously with
// finished=true, so the full onSlideEnd path executes in the same tick as
// advanceSlide — making timer-based assertions straightforward.

describe('SlidingTextCarousel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Static (single-text) path
  // ---------------------------------------------------------------------------

  it('renders the text when only one item is provided', () => {
    const { getByText } = render(<SlidingTextCarousel texts={['Only text']} />);
    expect(getByText('Only text')).toBeOnTheScreen();
  });

  it('renders an empty string gracefully when texts is empty', () => {
    const { toJSON } = render(<SlidingTextCarousel texts={[]} />);
    expect(toJSON()).not.toBeNull();
  });

  it('does not set up a rotation interval for a single text', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    render(<SlidingTextCarousel texts={['Only text']} />);
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Animated (multi-text) path — initial render
  // ---------------------------------------------------------------------------

  it('renders the first text in slot A initially', () => {
    const { getByText } = render(
      <SlidingTextCarousel texts={['First', 'Second', 'Third']} />,
    );
    expect(getByText('First')).toBeOnTheScreen();
  });

  it('pre-loads the second text into slot B', () => {
    const { getByText } = render(
      <SlidingTextCarousel texts={['First', 'Second', 'Third']} />,
    );
    // Slot B is off-screen but still in the tree
    expect(getByText('Second')).toBeOnTheScreen();
  });

  it('sets up a rotation interval for multiple texts', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    render(<SlidingTextCarousel texts={['First', 'Second']} />);
    expect(setIntervalSpy).toHaveBeenCalledWith(
      expect.any(Function),
      ROTATE_INTERVAL_MS,
    );
  });

  // ---------------------------------------------------------------------------
  // Slide cycle — requires containerWidth > 0
  // ---------------------------------------------------------------------------

  /**
   * Fire the onLayout event so advanceSlide stops early-returning due to
   * containerWidth === 0.
   */
  function triggerLayout(
    getByTestId: ReturnType<typeof render>['getByTestId'],
    width = 300,
  ) {
    // The animated Box has onLayout; fire it to set containerWidth
    const box = getByTestId('sliding-carousel-container');
    act(() => {
      box.props.onLayout({ nativeEvent: { layout: { width } } });
    });
  }

  it('calls onSlideComplete after the interval fires', () => {
    const onSlideComplete = jest.fn();
    const { getByTestId } = render(
      <SlidingTextCarousel
        texts={['First', 'Second', 'Third']}
        onSlideComplete={onSlideComplete}
        testID="sliding-carousel-container"
      />,
    );

    triggerLayout(getByTestId);

    act(() => {
      jest.advanceTimersByTime(ROTATE_INTERVAL_MS);
    });

    expect(onSlideComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onSlideStart when the interval begins a slide', () => {
    const onSlideStart = jest.fn();
    const { getByTestId } = render(
      <SlidingTextCarousel
        texts={['First', 'Second', 'Third']}
        onSlideStart={onSlideStart}
        testID="sliding-carousel-container"
      />,
    );

    triggerLayout(getByTestId);

    act(() => {
      jest.advanceTimersByTime(ROTATE_INTERVAL_MS);
    });

    expect(onSlideStart).toHaveBeenCalledTimes(1);
  });

  it('advances to the next text after one interval', () => {
    const { getByTestId, getByText } = render(
      <SlidingTextCarousel
        texts={['First', 'Second', 'Third']}
        testID="sliding-carousel-container"
      />,
    );

    triggerLayout(getByTestId);

    act(() => {
      jest.advanceTimersByTime(ROTATE_INTERVAL_MS);
    });

    // After one slide: 'Second' is now the visible front, 'Third' has been
    // loaded into the back slot
    expect(getByText('Second')).toBeOnTheScreen();
    expect(getByText('Third')).toBeOnTheScreen();
  });

  it('cycles back to the first text after a full rotation', () => {
    const texts = ['First', 'Second', 'Third'];
    const { getByTestId, getByText } = render(
      <SlidingTextCarousel texts={texts} testID="sliding-carousel-container" />,
    );

    triggerLayout(getByTestId);

    // Advance through all 3 texts (3 intervals)
    act(() => {
      jest.advanceTimersByTime(ROTATE_INTERVAL_MS * texts.length);
    });

    // After 3 slides the carousel has wrapped: 'First' is back as the front
    expect(getByText('First')).toBeOnTheScreen();
  });
});
