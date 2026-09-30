import { toRows } from './GachaSection.utils';

describe('toRows', () => {
  it('splits items into full rows and a shorter last row', () => {
    const items = [1, 2, 3, 4, 5];

    const rows = toRows(items, 3);

    expect(rows).toStrictEqual([
      [1, 2, 3],
      [4, 5],
    ]);
  });

  it('returns no row for no item', () => {
    const rows = toRows([], 3);

    expect(rows).toStrictEqual([]);
  });

  it('treats a size below one as one', () => {
    const rows = toRows(['a', 'b'], 0);

    expect(rows).toStrictEqual([['a'], ['b']]);
  });
});
