import {
  buildNumericSlots,
  getMovingNumericSlotKeys,
} from './buildNumericSlots';

const commasOf = (numeric: string) =>
  buildNumericSlots(numeric).filter((slot) => slot.character === ',');

describe('buildNumericSlots', () => {
  it('keys digits left to right', () => {
    const slots = buildNumericSlots('1,234');

    expect(slots.map((slot) => slot.key)).toEqual([
      'digit-0',
      'group-3',
      'digit-1',
      'digit-2',
      'digit-3',
    ]);
  });

  it('keeps existing digit keys when a digit is appended', () => {
    const before = buildNumericSlots('1,234')
      .filter((slot) => /\d/u.test(slot.character))
      .map((slot) => slot.key);
    const after = buildNumericSlots('12,345')
      .filter((slot) => /\d/u.test(slot.character))
      .map((slot) => slot.key);

    expect(after.slice(0, before.length)).toEqual(before);
    expect(after).toHaveLength(before.length + 1);
  });

  it('keeps a shifted grouping comma on the same wrapper key', () => {
    expect(commasOf('1,234').map((slot) => slot.key)).toEqual(['group-3']);
    expect(commasOf('12,345').map((slot) => slot.key)).toEqual(['group-3']);
  });

  it('gives a shifted grouping comma a new glyph key so it remounts', () => {
    expect(commasOf('1,234').map((slot) => slot.glyphKey)).toEqual([
      'group-glyph-1',
    ]);
    expect(commasOf('12,345').map((slot) => slot.glyphKey)).toEqual([
      'group-glyph-2',
    ]);
  });

  it('keeps each grouping comma wrapper keyed by digits to its right', () => {
    expect(commasOf('1,000,000').map((slot) => slot.key)).toEqual([
      'group-6',
      'group-3',
    ]);
    expect(commasOf('10,000,000').map((slot) => slot.key)).toEqual([
      'group-6',
      'group-3',
    ]);
  });

  it('uses the same key for digit glyphs so they do not remount', () => {
    const slots = buildNumericSlots('12.3');

    expect(slots.every((slot) => slot.glyphKey === slot.key)).toBe(true);
  });

  it('remounts digits when the placeholder generation changes', () => {
    expect(buildNumericSlots('0', 0)[0].key).toBe('digit-0');
    expect(buildNumericSlots('1', 1)[0].key).toBe('digit-0-1');
  });
});

describe('getMovingNumericSlotKeys', () => {
  it('returns no slots for a regular append', () => {
    const previous = buildNumericSlots('12', 1);
    const current = buildNumericSlots('123', 1);

    expect(getMovingNumericSlotKeys(previous, current)).toEqual(new Set());
  });

  it('returns only slots displaced by a moving comma', () => {
    const previous = buildNumericSlots('1,234', 1);
    const current = buildNumericSlots('12,345', 1);

    expect(getMovingNumericSlotKeys(previous, current)).toEqual(
      new Set(['digit-1-1', 'group-3']),
    );
  });

  it('excludes newly inserted slots from layout animation', () => {
    const previous = buildNumericSlots('999', 1);
    const current = buildNumericSlots('9,999', 1);

    expect(getMovingNumericSlotKeys(previous, current).has('group-3')).toBe(
      false,
    );
  });
});
