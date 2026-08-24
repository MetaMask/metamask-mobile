import { deepSnakeCaseKeys } from './analytics';

describe('deepSnakeCaseKeys', () => {
  it('converts camelCase keys to snake_case', () => {
    const input = { myKey: 'value', anotherKey: 42 };

    expect(deepSnakeCaseKeys(input)).toStrictEqual({
      my_key: 'value',
      another_key: 42,
    });
  });

  it('handles nested objects recursively', () => {
    const input = {
      outerKey: {
        innerKey: 'value',
        deeperLevel: {
          deepKey: true,
        },
      },
    };

    expect(deepSnakeCaseKeys(input)).toStrictEqual({
      outer_key: {
        inner_key: 'value',
        deeper_level: {
          deep_key: true,
        },
      },
    });
  });

  it('handles arrays by converting each element', () => {
    const input = [{ itemKey: 1 }, { itemKey: 2 }];

    expect(deepSnakeCaseKeys(input)).toStrictEqual([
      { item_key: 1 },
      { item_key: 2 },
    ]);
  });

  it('handles arrays nested inside objects', () => {
    const input = {
      myList: [{ listItemKey: 'a' }, { listItemKey: 'b' }],
    };

    expect(deepSnakeCaseKeys(input)).toStrictEqual({
      my_list: [{ list_item_key: 'a' }, { list_item_key: 'b' }],
    });
  });

  it('returns primitive values unchanged', () => {
    expect(deepSnakeCaseKeys('hello')).toBe('hello');
    expect(deepSnakeCaseKeys(42)).toBe(42);
    expect(deepSnakeCaseKeys(true)).toBe(true);
    expect(deepSnakeCaseKeys(null)).toBeNull();
    expect(deepSnakeCaseKeys(undefined)).toBeUndefined();
  });

  it('handles empty objects', () => {
    expect(deepSnakeCaseKeys({})).toStrictEqual({});
  });

  it('handles empty arrays', () => {
    expect(deepSnakeCaseKeys([])).toStrictEqual([]);
  });

  it('preserves keys already in snake_case', () => {
    const input = { already_snake: 'value' };

    expect(deepSnakeCaseKeys(input)).toStrictEqual({
      already_snake: 'value',
    });
  });
});
