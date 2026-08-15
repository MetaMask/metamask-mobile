import { act, renderHook } from '@testing-library/react-native';
import type { ScrollView, View } from 'react-native';
import {
  getKeyboardScrollDelta,
  KEYBOARD_CLEARANCE_PX,
  usePerpsProKeyboardScroll,
} from './usePerpsProKeyboardScroll';

// Screen-space px, matching `measureInWindow`: a 400px band between a header
// ending at 100 and a keyboard starting at 500.
const VIEWPORT_TOP = 100;
const KEYBOARD_TOP = 500;
const WINDOW_HEIGHT = 800;
const KEYBOARD_HEIGHT = WINDOW_HEIGHT - KEYBOARD_TOP;

/** Card top 400, height 150 => bottom 550, i.e. 50px into the keyboard. */
const EXPECTED_DELTA = 550 + KEYBOARD_CLEARANCE_PX - KEYBOARD_TOP;

// `var` + `mock` prefix so the jest.mock factory may close over it.
// eslint-disable-next-line no-var
var mockKeyboardHandler: { onStart?: (event: { height: number }) => void } = {};

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 400, height: 800, scale: 2, fontScale: 1 }),
}));

jest.mock('react-native-keyboard-controller', () => ({
  useGenericKeyboardHandler: (handler: typeof mockKeyboardHandler) => {
    mockKeyboardHandler = handler;
  },
}));

/** Stands in for a laid-out card whose bottom edge sits at `cardTop + height`. */
const fakeCard = ({
  cardTop,
  height = 150,
}: {
  cardTop: number;
  height?: number;
}) =>
  ({
    measureInWindow: (
      cb: (x: number, y: number, w: number, h: number) => void,
    ) => cb(0, cardTop, 200, height),
  }) as unknown as View;

const fakeScrollView = (viewportTop = VIEWPORT_TOP) =>
  ({
    measureInWindow: (
      cb: (x: number, y: number, w: number, h: number) => void,
    ) => cb(0, viewportTop, 400, 600),
  }) as unknown as ScrollView;

/**
 * Renders the hook with a card attached and the field optionally focused.
 *
 * @param options - Test setup.
 * @param options.card - Card instance to attach, or null to leave it unset.
 * @param options.scrollView - Scroll view instance, or null for none.
 * @param options.focus - Whether to focus before the keyboard appears.
 * @returns The scroll spy and the rendered hook result.
 */
function setup({
  card = fakeCard({ cardTop: 400 }),
  scrollView = fakeScrollView(),
  focus = true,
}: {
  card?: View | null;
  scrollView?: ScrollView | null;
  focus?: boolean;
} = {}) {
  const onRequestScrollBy = jest.fn();
  const scrollViewRef = { current: scrollView };
  const { result } = renderHook(() =>
    usePerpsProKeyboardScroll({ onRequestScrollBy, scrollViewRef }),
  );

  result.current.cardRef.current = card;
  if (focus) {
    act(() => result.current.onFocus());
  }

  return { onRequestScrollBy, result };
}

/**
 * Fires the keyboard event and flushes the worklet hop. The project's
 * `react-native-worklets` mock defers `scheduleOnRN` via `queueMicrotask`, so
 * the correction lands a microtask after the event rather than inline.
 *
 * @param height - Keyboard height; 0 represents a dismissal.
 */
async function raiseKeyboard(height = KEYBOARD_HEIGHT) {
  await act(async () => {
    mockKeyboardHandler.onStart?.({ height });
  });
}

const deltaFor = ({
  cardTop,
  cardHeight,
}: {
  cardTop: number;
  cardHeight: number;
}) =>
  getKeyboardScrollDelta({
    cardTop,
    cardBottom: cardTop + cardHeight,
    viewportTop: VIEWPORT_TOP,
    keyboardTop: KEYBOARD_TOP,
  });

describe('getKeyboardScrollDelta', () => {
  describe('card below the keyboard', () => {
    it('scrolls down by the overlap plus the clearance', () => {
      // Bottom at 550, i.e. 50px into the keyboard.
      const delta = deltaFor({ cardTop: 400, cardHeight: 150 });

      expect(delta).toBe(EXPECTED_DELTA);
    });

    it('stops short rather than pushing the card top off screen', () => {
      // 20px of headroom against 165px of overlap: capped, so the bottom stays
      // partly covered rather than hiding the value being typed.
      const delta = deltaFor({ cardTop: VIEWPORT_TOP + 20, cardHeight: 530 });

      expect(delta).toBe(20);
    });

    it('does not scroll when the card already clears the keyboard', () => {
      // Bottom at 350, comfortably above the keyboard.
      expect(deltaFor({ cardTop: 200, cardHeight: 150 })).toBe(0);
    });

    it('leaves the exact clearance untouched', () => {
      // Bottom sits exactly KEYBOARD_CLEARANCE_PX above the keyboard.
      const cardTop = KEYBOARD_TOP - KEYBOARD_CLEARANCE_PX - 150;

      expect(deltaFor({ cardTop, cardHeight: 150 })).toBe(0);
    });
  });

  describe('card above the viewport', () => {
    it('scrolls up to pull the card back into view', () => {
      // 40px off the top of the visible band.
      const delta = deltaFor({ cardTop: VIEWPORT_TOP - 40, cardHeight: 150 });

      expect(delta).toBe(-40);
    });

    it('does not pull so far up that the card re-enters the keyboard', () => {
      // Off the top by 300px, but the keyboard clearance line allows far less.
      const cardTop = VIEWPORT_TOP - 300;
      const cardHeight = 650;
      const overlap =
        cardTop + cardHeight + KEYBOARD_CLEARANCE_PX - KEYBOARD_TOP;

      expect(deltaFor({ cardTop, cardHeight })).toBe(overlap);
    });
  });

  it('does nothing when the card already sits inside the band', () => {
    expect(deltaFor({ cardTop: VIEWPORT_TOP + 50, cardHeight: 200 })).toBe(0);
  });

  it('restores the top of a card too tall to fit the band', () => {
    const delta = deltaFor({ cardTop: VIEWPORT_TOP - 40, cardHeight: 500 });

    expect(delta).toBe(-40);
  });
});

describe('usePerpsProKeyboardScroll', () => {
  beforeEach(() => {
    mockKeyboardHandler = {};
  });

  it('subscribes to keyboard movement', () => {
    setup();

    expect(mockKeyboardHandler.onStart).toBeInstanceOf(Function);
  });

  it('aligns on focus when the keyboard is already up for another field', async () => {
    const { onRequestScrollBy, result } = setup({ focus: false });
    await raiseKeyboard();
    onRequestScrollBy.mockClear();

    act(() => result.current.onFocus());

    expect(onRequestScrollBy).toHaveBeenCalledWith(EXPECTED_DELTA);
  });

  it('scrolls the card clear when the keyboard rises over it', async () => {
    const { onRequestScrollBy } = setup();

    await raiseKeyboard();

    expect(onRequestScrollBy).toHaveBeenCalledWith(EXPECTED_DELTA);
  });

  it('measures the visible band from the scroll view when one is given', async () => {
    // Card off the top of the band, so the correction depends on viewportTop.
    const { onRequestScrollBy } = setup({
      card: fakeCard({ cardTop: VIEWPORT_TOP - 40 }),
    });

    await raiseKeyboard();

    expect(onRequestScrollBy).toHaveBeenCalledWith(-40);
  });

  it('treats the whole screen as the band without a scroll view', async () => {
    // viewportTop falls back to 0, so a card at 60 is no longer off the top and
    // nothing needs correcting.
    const { onRequestScrollBy } = setup({
      card: fakeCard({ cardTop: 60 }),
      scrollView: null,
    });

    await raiseKeyboard();

    expect(onRequestScrollBy).not.toHaveBeenCalled();
  });

  it('does not scroll when the field is not focused', async () => {
    const { onRequestScrollBy } = setup({ focus: false });

    await raiseKeyboard();

    expect(onRequestScrollBy).not.toHaveBeenCalled();
  });

  it('stops responding after blur', async () => {
    const { onRequestScrollBy, result } = setup();

    act(() => result.current.onBlur());
    await raiseKeyboard();

    expect(onRequestScrollBy).not.toHaveBeenCalled();
  });

  it('does nothing when the card has not been attached', async () => {
    const { onRequestScrollBy } = setup({ card: null });

    await raiseKeyboard();

    expect(onRequestScrollBy).not.toHaveBeenCalled();
  });

  it('does nothing while the card has no laid-out height', async () => {
    const { onRequestScrollBy } = setup({
      card: fakeCard({ cardTop: 400, height: 0 }),
    });

    await raiseKeyboard();

    expect(onRequestScrollBy).not.toHaveBeenCalled();
  });

  it('ignores the dismiss event', async () => {
    const { onRequestScrollBy } = setup();

    await raiseKeyboard(0);

    expect(onRequestScrollBy).not.toHaveBeenCalled();
  });

  it('skips corrections inside the deadband', async () => {
    // Bottom at 490, so only 5px is owed — at the threshold, not past it.
    const { onRequestScrollBy } = setup({ card: fakeCard({ cardTop: 340 }) });

    await raiseKeyboard();

    expect(onRequestScrollBy).not.toHaveBeenCalled();
  });

  it('is inert when no scroll handler is supplied', async () => {
    const scrollViewRef = { current: fakeScrollView() };
    const { result } = renderHook(() =>
      usePerpsProKeyboardScroll({ scrollViewRef }),
    );
    result.current.cardRef.current = fakeCard({ cardTop: 400 });
    act(() => result.current.onFocus());

    await expect(raiseKeyboard()).resolves.not.toThrow();
  });

  describe('realign', () => {
    it('re-runs the correction against the keyboard already on screen', async () => {
      const { onRequestScrollBy, result } = setup();
      await raiseKeyboard();
      onRequestScrollBy.mockClear();

      // A re-tap fires no focus or keyboard event, so this is the only trigger.
      act(() => result.current.realign());

      expect(onRequestScrollBy).toHaveBeenCalledWith(EXPECTED_DELTA);
    });

    it('does nothing while the keyboard is down', () => {
      const { onRequestScrollBy, result } = setup();

      act(() => result.current.realign());

      expect(onRequestScrollBy).not.toHaveBeenCalled();
    });

    it('does nothing after the keyboard has been dismissed', async () => {
      const { onRequestScrollBy, result } = setup();
      await raiseKeyboard();
      await raiseKeyboard(0);
      onRequestScrollBy.mockClear();

      act(() => result.current.realign());

      expect(onRequestScrollBy).not.toHaveBeenCalled();
    });
  });
});
