export interface NumericSlotDescriptor {
  character: string;
  /**
   * Identity of the layout wrapper. Digits are left-to-right; grouping commas
   * use digits-to-the-right so a shift (`1,234` → `12,345`) keeps the same
   * view and can interpolate with its neighbours when font size changes.
   */
  key: string;
  /**
   * Identity of the painted glyph. For commas this is digits-to-the-left, so a
   * shift remounts only the glyph (fade out / fade in) without discarding the
   * wrapper that LinearTransition is tracking.
   */
  glyphKey: string;
}

/**
 * Builds stable slot identities for an append-only numeric string.
 *
 * Digits are keyed left-to-right so appending leaves existing digits in place.
 * Grouping commas keep a stable wrapper key (digits to their right) and a
 * position-sensitive glyph key (digits to their left).
 *
 * `generation` remounts every digit slot. Use a different generation for the
 * zero placeholder so the first typed digit fades in instead of reusing the
 * placeholder's `digit-0` identity.
 */
export const buildNumericSlots = (
  numeric: string,
  generation = 0,
): NumericSlotDescriptor[] => {
  let digitIndex = 0;
  const integerEnd = numeric.indexOf('.');
  const integer = numeric.slice(
    0,
    integerEnd === -1 ? numeric.length : integerEnd,
  );
  const generationSuffix = generation === 0 ? '' : `-${generation}`;
  let integerDigitsToLeft = 0;
  let integerDigitCount = 0;

  for (const character of integer) {
    if (character >= '0' && character <= '9') {
      integerDigitCount += 1;
    }
  }

  return numeric.split('').map((character, index) => {
    if (character >= '0' && character <= '9') {
      const key = `digit-${digitIndex++}${generationSuffix}`;

      if (index < integer.length) {
        integerDigitsToLeft += 1;
      }

      return { character, key, glyphKey: key };
    }

    if (character === ',') {
      return {
        character,
        key: `group-${integerDigitCount - integerDigitsToLeft}`,
        glyphKey: `group-glyph-${integerDigitsToLeft}`,
      };
    }

    const key = `separator-${character}-${index}`;

    return { character, key, glyphKey: key };
  });
};

/**
 * Returns existing slots whose position in the row changed. New slots use
 * their enter animation; unchanged slots do not need a layout observer.
 */
export const getMovingNumericSlotKeys = (
  previous: NumericSlotDescriptor[],
  current: NumericSlotDescriptor[],
): Set<string> => {
  const previousIndexes = new Map(
    previous.map(({ key }, index) => [key, index]),
  );

  return new Set(
    current
      .filter(({ key }, index) => {
        const previousIndex = previousIndexes.get(key);

        return previousIndex !== undefined && previousIndex !== index;
      })
      .map(({ key }) => key),
  );
};
