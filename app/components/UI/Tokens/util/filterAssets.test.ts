import { filterAssets, FilterCriteria } from './filterAssets';

describe('filterAssets function', () => {
  interface MockToken {
    name: string;
    symbol: string;
    chainId: string;
    balance: number;
  }

  const mockTokens: MockToken[] = [
    { name: 'Token1', symbol: 'T1', chainId: '0x01', balance: 100 },
    { name: 'Token2', symbol: 'T2', chainId: '0x02', balance: 50 },
    { name: 'Token3', symbol: 'T3', chainId: '0x01', balance: 200 },
    { name: 'Token4', symbol: 'T4', chainId: '0x89', balance: 150 },
  ];

  test('returns all assets if no criteria are provided', () => {
    const criteria: FilterCriteria[] = [];

    const filtered = filterAssets(mockTokens, criteria);

    expect(filtered).toEqual(mockTokens); // No filtering occurs
  });

  test('returns all assets if filterCallback is undefined', () => {
    const criteria: FilterCriteria[] = [
      {
        key: 'chainId',
        opts: { '0x01': true, '0x89': true }, // Valid opts
        filterCallback: undefined as unknown as 'inclusive', // Undefined callback
      },
    ];

    const filtered = filterAssets(mockTokens, criteria);

    expect(filtered).toEqual(mockTokens); // No filtering occurs due to missing filterCallback
  });

  test('filters by inclusive chainId', () => {
    const criteria: FilterCriteria[] = [
      {
        key: 'chainId',
        opts: { '0x01': true, '0x89': true },
        filterCallback: 'inclusive',
      },
    ];

    const filtered = filterAssets(mockTokens, criteria);

    expect(filtered).toHaveLength(3);
    expect(filtered.map((token) => token.chainId)).toEqual([
      '0x01',
      '0x01',
      '0x89',
    ]);
  });

  test('filters tokens with balance between 100 and 150 inclusive', () => {
    const criteria: FilterCriteria[] = [
      {
        key: 'balance',
        opts: { min: 100, max: 150 },
        filterCallback: 'range',
      },
    ];

    const filtered = filterAssets(mockTokens, criteria);

    expect(filtered).toHaveLength(2); // Token1 and Token4
    expect(filtered.map((token) => token.balance)).toEqual([100, 150]);
  });

  test('filters by inclusive chainId and balance range', () => {
    const criteria: FilterCriteria[] = [
      {
        key: 'chainId',
        opts: { '0x01': true, '0x89': true },
        filterCallback: 'inclusive',
      },
      {
        key: 'balance',
        opts: { min: 100, max: 150 },
        filterCallback: 'range',
      },
    ];

    const filtered = filterAssets(mockTokens, criteria);

    expect(filtered).toHaveLength(2); // Token1 and Token4
  });

  test('returns no tokens if no chainId matches', () => {
    const criteria: FilterCriteria[] = [
      {
        key: 'chainId',
        opts: { '0x04': true },
        filterCallback: 'inclusive',
      },
    ];

    const filtered = filterAssets(mockTokens, criteria);

    expect(filtered).toHaveLength(0); // No matching tokens
  });

  test('returns no tokens if balance is not within range', () => {
    const criteria: FilterCriteria[] = [
      {
        key: 'balance',
        opts: { min: 300, max: 400 },
        filterCallback: 'range',
      },
    ];

    const filtered = filterAssets(mockTokens, criteria);

    expect(filtered).toHaveLength(0); // No matching tokens
  });

  test('handles empty opts in inclusive callback', () => {
    const criteria: FilterCriteria[] = [
      {
        key: 'chainId',
        opts: {}, // Empty opts
        filterCallback: 'inclusive',
      },
    ];

    const filtered = filterAssets(mockTokens, criteria);

    expect(filtered).toHaveLength(0); // No tokens match empty opts
  });

  test('handles invalid range opts', () => {
    const criteria: FilterCriteria[] = [
      {
        key: 'balance',
        opts: { min: undefined, max: undefined } as unknown as {
          min: number;
          max: number;
        },
        filterCallback: 'range',
      },
    ];

    const filtered = filterAssets(mockTokens, criteria);

    expect(filtered).toHaveLength(0); // No tokens match invalid range
  });

  test('handles missing values in assets gracefully', () => {
    const incompleteTokens = [
      { name: 'Token1', symbol: 'T1', chainId: '0x01' }, // Missing balance
    ];

    const criteria: FilterCriteria[] = [
      {
        key: 'balance',
        opts: { min: 100, max: 150 },
        filterCallback: 'range',
      },
    ];

    const filtered = filterAssets(incompleteTokens, criteria);

    expect(filtered).toHaveLength(0); // Incomplete token doesn't match
  });

  test('ignores unknown filterCallback types', () => {
    const criteria: FilterCriteria[] = [
      {
        key: 'balance',
        opts: { min: 100, max: 150 },
        filterCallback: 'unknown' as unknown as 'inclusive',
      },
    ];

    const filtered = filterAssets(mockTokens, criteria);

    expect(filtered).toEqual(mockTokens); // Unknown callback doesn't filter
  });
});
