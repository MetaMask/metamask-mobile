import reducer, {
  HEADLESS_ORDER_CONTEXT_TTL_MS,
  setHeadlessOrderContextEntry,
  removeHeadlessOrderContextEntry,
  clearHeadlessOrderContexts,
  type HeadlessOrderContextsState,
} from './headlessOrderContexts';

describe('headlessOrderContexts slice', () => {
  const NOW = 1_700_000_000_000;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores a context entry with a createdAt timestamp', () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);

    const state = reducer(
      undefined,
      setHeadlessOrderContextEntry({
        key: 'order-1',
        context: { rampSurface: 'prediction', region: 'de' },
      }),
    );

    expect(state).toEqual({
      'order-1': { rampSurface: 'prediction', region: 'de', createdAt: NOW },
    });
  });

  it('removes a context entry', () => {
    const initial: HeadlessOrderContextsState = {
      'order-1': { region: 'de', createdAt: NOW },
    };

    expect(
      reducer(initial, removeHeadlessOrderContextEntry('order-1')),
    ).toEqual({});
  });

  it('clears all entries', () => {
    const initial: HeadlessOrderContextsState = {
      'order-1': { region: 'de', createdAt: NOW },
      'order-2': { region: 'us', createdAt: NOW },
    };

    expect(reducer(initial, clearHeadlessOrderContexts())).toEqual({});
  });

  it('evicts entries older than the TTL on write (GC-on-write)', () => {
    const stale: HeadlessOrderContextsState = {
      'stale-order': {
        region: 'de',
        createdAt: NOW - HEADLESS_ORDER_CONTEXT_TTL_MS - 1,
      },
      'fresh-order': {
        region: 'us',
        createdAt: NOW - 1000,
      },
    };
    jest.spyOn(Date, 'now').mockReturnValue(NOW);

    const state = reducer(
      stale,
      setHeadlessOrderContextEntry({
        key: 'new-order',
        context: { region: 'fr' },
      }),
    );

    // Stale evicted; fresh kept; new added.
    expect(Object.keys(state).sort()).toEqual(['fresh-order', 'new-order']);
    expect(state['stale-order']).toBeUndefined();
  });
});
