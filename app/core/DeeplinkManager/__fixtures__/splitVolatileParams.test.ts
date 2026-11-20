import { splitVolatileParams } from './splitVolatileParams';

describe('splitVolatileParams', () => {
  it('removes volatile paths and keeps stable fields', () => {
    const value = { screen: 'A', params: { url: 'x', timestamp: 123 } };

    const result = splitVolatileParams(value, [
      { path: 'params.timestamp', type: 'number' },
    ]);

    expect(result).toEqual({
      stable: { screen: 'A', params: { url: 'x' } },
      violations: [],
    });
  });

  it('does not mutate the input', () => {
    const value = { params: { timestamp: 1 } };

    splitVolatileParams(value, [{ path: 'params.timestamp', type: 'number' }]);

    expect(value).toEqual({ params: { timestamp: 1 } });
  });

  it('reports a volatile field with the wrong type', () => {
    const result = splitVolatileParams({ id: 5 }, [
      { path: 'id', type: 'string' },
    ]);

    expect(result.violations).toEqual(['id']);
  });

  it('reports a missing volatile field', () => {
    const result = splitVolatileParams({ other: 1 }, [
      { path: 'params.timestamp', type: 'number' },
    ]);

    expect(result.violations).toEqual(['params.timestamp']);
  });

  it('returns the value unchanged when no volatile paths are given', () => {
    const value = { a: 1 };

    expect(splitVolatileParams(value)).toEqual({
      stable: value,
      violations: [],
    });
  });
});
