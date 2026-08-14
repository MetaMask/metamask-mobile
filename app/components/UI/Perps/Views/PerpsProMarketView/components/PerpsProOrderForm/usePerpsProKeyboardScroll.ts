import { useCallback, useRef } from 'react';
import { useWindowDimensions, type ScrollView, type View } from 'react-native';
import { useGenericKeyboardHandler } from 'react-native-keyboard-controller';
import { scheduleOnRN } from 'react-native-worklets';

export const KEYBOARD_CLEARANCE_PX = 15;

/** Below this a correction is imperceptible but still reads as a twitch. */
export const MIN_SCROLL_DELTA_PX = 5;

export interface PerpsProKeyboardScroll {
  cardRef: React.RefObject<View | null>;
  onFocus: () => void;
  onBlur: () => void;
  /** Tapping an already-focused input fires no focus or keyboard event. */
  realign: () => void;
}

export interface PerpsProKeyboardScrollOptions {
  /** Positive scrolls down, negative up. Omitted disables the behaviour. */
  onRequestScrollBy?: (delta: number) => void;
  /** Measured to locate the top of the visible band. */
  scrollViewRef?: React.RefObject<ScrollView | null>;
}

/**
 * Scrolling down by `d` shifts both card edges by `-d`, giving two constraints:
 *
 * - card clears the keyboard: `d >= overlap`
 * - card top stays on screen: `d <= headroom`
 *
 * @param bounds - Screen-space edges, in one coordinate system.
 * @param bounds.cardTop - Top edge of the card.
 * @param bounds.cardBottom - Bottom edge of the card.
 * @param bounds.viewportTop - Top edge of the visible scroll area.
 * @param bounds.keyboardTop - Top edge of the keyboard.
 * @returns Scroll delta in px; positive down, negative up, 0 to stay put.
 */
export function getKeyboardScrollDelta({
  cardTop,
  cardBottom,
  viewportTop,
  keyboardTop,
}: {
  cardTop: number;
  cardBottom: number;
  viewportTop: number;
  keyboardTop: number;
}): number {
  /** > 0 => card hangs below the keyboard by this much. */
  const overlap = cardBottom + KEYBOARD_CLEARANCE_PX - keyboardTop;
  /** < 0 => card has run off the top of the viewport by this much. */
  const headroom = cardTop - viewportTop;

  if (overlap > 0) {
    // Capped so the card's top never leaves the viewport: the value being typed
    // lives there, so hiding it to reveal the bottom edge is a worse trade.
    return Math.min(overlap, Math.max(headroom, 0));
  }

  if (headroom < 0) {
    return Math.max(headroom, overlap);
  }

  return 0;
}

/**
 * Keeps a focused card inside the band left visible by the keyboard.
 *
 * Measured against the keyboard's reported frame rather than a fixed offset,
 * since its height varies with platform, third-party keyboards, suggestion
 * strips and the iOS `InputAccessoryView`.
 *
 * `onStart` carries the final height as the keyboard begins animating, so the
 * scroll runs alongside it rather than after it. The generic handler avoids
 * `useKeyboardHandler`, which forces `adjustResize` on Android.
 *
 * One-shot per appearance: a later user scroll is intentional.
 *
 * @param options - Scroll callback and the owning scroll view.
 * @returns Card ref, plus focus/blur handlers to compose with the input's own.
 */
export function usePerpsProKeyboardScroll(
  options: PerpsProKeyboardScrollOptions = {},
): PerpsProKeyboardScroll {
  const { onRequestScrollBy, scrollViewRef } = options;
  const cardRef = useRef<View | null>(null);
  // A ref so focus changes need not re-render the form.
  const isFocusedRef = useRef(false);
  const { height: windowHeight } = useWindowDimensions();

  const onFocus = useCallback(() => {
    isFocusedRef.current = true;
  }, []);

  const onBlur = useCallback(() => {
    isFocusedRef.current = false;
  }, []);

  const alignCard = useCallback(
    (keyboardHeight: number) => {
      const card = cardRef.current;
      if (!isFocusedRef.current || !onRequestScrollBy || !card) {
        return;
      }

      card.measureInWindow((_x, cardTop, _width, cardHeight) => {
        if (!cardHeight) {
          // A zero height means layout has not run yet, so there is no real
          // position to measure against.
          return;
        }

        const keyboardTop = windowHeight - keyboardHeight;
        const scroll = (viewportTop: number) => {
          const delta = getKeyboardScrollDelta({
            cardTop,
            cardBottom: cardTop + cardHeight,
            viewportTop,
            keyboardTop,
          });

          if (Math.abs(delta) > MIN_SCROLL_DELTA_PX) {
            onRequestScrollBy(delta);
          }
        };

        // `ScrollView`'s type omits the measure methods its host instance has.
        const scrollView = scrollViewRef?.current as View | null | undefined;
        if (typeof scrollView?.measureInWindow !== 'function') {
          // Fall back to treating the whole screen as the visible band. The
          // card still clears the keyboard; only the top-edge clamp is lost.
          scroll(0);
          return;
        }

        scrollView.measureInWindow((_sx, viewportTop) => scroll(viewportTop));
      });
    },
    [onRequestScrollBy, scrollViewRef, windowHeight],
  );

  // Last reported height; 0 while dismissed. Lets a re-tap realign with no
  // keyboard event to trigger it.
  const keyboardHeightRef = useRef(0);

  const handleKeyboardStart = useCallback(
    (height: number) => {
      keyboardHeightRef.current = height;

      if (height > 0) {
        alignCard(height);
      }
    },
    [alignCard],
  );

  useGenericKeyboardHandler(
    {
      onStart: (event) => {
        'worklet';

        scheduleOnRN(handleKeyboardStart, event.height);
      },
    },
    [handleKeyboardStart],
  );

  const realign = useCallback(() => {
    if (keyboardHeightRef.current > 0) {
      alignCard(keyboardHeightRef.current);
    }
  }, [alignCard]);

  return { cardRef, onFocus, onBlur, realign };
}
