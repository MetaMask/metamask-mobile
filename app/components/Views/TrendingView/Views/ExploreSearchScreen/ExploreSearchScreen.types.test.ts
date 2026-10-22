import { getTrimmedInitialQuery } from './ExploreSearchScreen.types';

describe('getTrimmedInitialQuery', () => {
  it('trims string route params', () => {
    expect(getTrimmedInitialQuery('  Apple  ')).toBe('Apple');
  });

  it('returns an empty query for invalid route params', () => {
    expect(getTrimmedInitialQuery(undefined)).toBe('');
    expect(getTrimmedInitialQuery({ query: 'Apple' })).toBe('');
  });
});
