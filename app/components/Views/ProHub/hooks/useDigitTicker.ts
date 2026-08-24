import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

export const DIGIT_TICKER_TICK_MS = 45;
export const DIGIT_TICKER_START_DELAY_MS = 250;

/**
 * Replaces every digit with `0`, leaving currency symbols and separators intact.
 */
export const zeroDigits = (value: string): string => value.replace(/\d/g, '0');

/**
 * Indexes of digit characters in a formatted currency string.
 */
export const getDigitIndexes = (value: string): number[] =>
  [...value].flatMap((char, index) => (/\d/.test(char) ? [index] : []));

/**
 * Sequential frames for a left-to-right digit ticker: each digit counts
 * from 0 to its target before the next digit starts.
 */
export const buildDigitTickerFrames = (finalValue: string): string[] => {
  const chars = [...zeroDigits(finalValue)];
  const frames = [chars.join('')];

  for (const index of getDigitIndexes(finalValue)) {
    const target = Number(finalValue[index]);
    for (let digit = 1; digit <= target; digit++) {
      chars[index] = String(digit);
      frames.push(chars.join(''));
    }
  }

  return frames;
};

/**
 * Animates a formatted currency string one digit at a time from zeros to
 * `finalValue`. Skips the animation when reduced motion is on.
 */
export const useDigitTicker = (finalValue: string): string => {
  const reduceMotion = useReducedMotion();
  const skipAnimation = Boolean(reduceMotion);

  const [displayed, setDisplayed] = useState(() =>
    skipAnimation ? finalValue : zeroDigits(finalValue),
  );

  useEffect(() => {
    if (skipAnimation) {
      setDisplayed(finalValue);
      return;
    }

    const frames = buildDigitTickerFrames(finalValue);
    let frameIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const playNextFrame = () => {
      setDisplayed(frames[frameIndex]);
      frameIndex += 1;
      if (frameIndex < frames.length) {
        timeoutId = setTimeout(playNextFrame, DIGIT_TICKER_TICK_MS);
      }
    };

    timeoutId = setTimeout(playNextFrame, DIGIT_TICKER_START_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [finalValue, skipAnimation]);

  return displayed;
};
