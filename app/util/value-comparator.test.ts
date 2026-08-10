import { previousValueComparator } from './value-comparator';

describe('previousValueComparator', () => {
  it('passes initialValue as previous and first argument as next on first call', () => {
    const comparator = jest.fn().mockReturnValue(true);
    const compare = previousValueComparator(comparator, 'initial');

    compare('first');

    expect(comparator).toHaveBeenCalledTimes(1);
    expect(comparator).toHaveBeenCalledWith('initial', 'first');
  });

  it('passes previous cached value and current value on subsequent calls', () => {
    const comparator = jest.fn().mockReturnValue(true);
    const compare = previousValueComparator(comparator, 'initial');

    compare('first');
    compare('second');
    compare('third');

    expect(comparator).toHaveBeenNthCalledWith(1, 'initial', 'first');
    expect(comparator).toHaveBeenNthCalledWith(2, 'first', 'second');
    expect(comparator).toHaveBeenNthCalledWith(3, 'second', 'third');
  });

  it('returns the comparator result', () => {
    const compare = previousValueComparator(
      (previous, next) => previous !== next,
      false,
    );

    expect(compare(true)).toBe(true);
    expect(compare(true)).toBe(false);
    expect(compare(false)).toBe(true);
  });

  it('uses current value as previous when initialValue is nullish', () => {
    const comparator = jest.fn().mockReturnValue(true);
    const compare = previousValueComparator(
      comparator,
      undefined as unknown as string,
    );

    compare('first');

    expect(comparator).toHaveBeenCalledWith('first', 'first');
  });

  it('caches the current value even when comparator throws', () => {
    const comparator = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('compare failed');
      })
      .mockReturnValue(true);
    const compare = previousValueComparator(comparator, 'initial');

    expect(() => compare('first')).toThrow('compare failed');

    compare('second');

    expect(comparator).toHaveBeenNthCalledWith(2, 'first', 'second');
  });
});
