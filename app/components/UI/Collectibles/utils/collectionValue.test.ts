import { getCollectionValueUsd } from './collectionValue';

describe('getCollectionValueUsd', () => {
  it('sums insured values without substituting missing prices', () => {
    expect(
      getCollectionValueUsd([{ insuredValue: 13 }, {}, { insuredValue: 49 }]),
    ).toBe(62);
  });
  it('values an empty collection at zero', () => {
    expect(getCollectionValueUsd([])).toBe(0);
  });
});
