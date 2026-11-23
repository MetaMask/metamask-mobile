import {
  getSearchQueryFromRouteParams,
  getTrimmedInitialQuery,
} from './ExploreSearchScreen.types';

describe('getTrimmedInitialQuery', () => {
  it('trims string route params', () => {
    expect(getTrimmedInitialQuery('  Apple  ')).toBe('Apple');
  });

  it('returns an empty query for invalid route params', () => {
    expect(getTrimmedInitialQuery(undefined)).toBe('');
    expect(getTrimmedInitialQuery({ query: 'Apple' })).toBe('');
  });
});

describe('getSearchQueryFromRouteParams', () => {
  it('clears the query for a deeplink without an initial query', () => {
    expect(getSearchQueryFromRouteParams({ entryPoint: 'deeplink' })).toBe('');
  });

  it('does not update the query for an in-app route without an initial query', () => {
    expect(
      getSearchQueryFromRouteParams({ entryPoint: 'home' }),
    ).toBeUndefined();
  });
});
