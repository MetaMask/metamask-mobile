import { buildAllocationValues } from './allocationUtils';

describe('buildAllocationValues', () => {
  it('omits empty and invalid categories and calculates percentages', () => {
    expect(
      buildAllocationValues([
        { key: 'money', value: 4000 },
        { key: 'tokens', value: 3000 },
        { key: 'perpetuals', value: 0 },
        { key: 'predictions', value: Number.NaN },
        { key: 'defi', value: 1000 },
      ]),
    ).toEqual([
      { key: 'money', value: 4000, percentage: 50 },
      { key: 'tokens', value: 3000, percentage: 37.5 },
      { key: 'defi', value: 1000, percentage: 12.5 },
    ]);
  });

  it('returns no rows when the wallet has no allocations', () => {
    expect(
      buildAllocationValues([
        { key: 'money', value: 0 },
        { key: 'tokens', value: -1 },
      ]),
    ).toEqual([]);
  });

  it('orders categories from highest to lowest allocation', () => {
    expect(
      buildAllocationValues([
        { key: 'money', value: 100 },
        { key: 'tokens', value: 700 },
        { key: 'perpetuals', value: 200 },
      ]).map(({ key }) => key),
    ).toEqual(['tokens', 'perpetuals', 'money']);
  });
});
