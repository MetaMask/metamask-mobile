import { selectActiveTabEntryPointForOrigin } from './selectors';

const buildState = (
  tabs: { id: number; url?: string; entryPoint?: 'explore_search' }[],
  activeTab: number | null,
) => ({ browser: { tabs, activeTab } });

describe('selectActiveTabEntryPointForOrigin', () => {
  it.each([
    ['a bare hostname', 'app.uniswap.org'],
    ['an origin', 'https://app.uniswap.org'],
    ['a full url', 'https://app.uniswap.org/swap?chain=base'],
  ])(
    'returns the entry point when the active tab shows %s',
    (_label, origin) => {
      const state = buildState(
        [
          {
            id: 1,
            url: 'https://app.uniswap.org/pools',
            entryPoint: 'explore_search',
          },
        ],
        1,
      );

      expect(selectActiveTabEntryPointForOrigin(state, origin)).toBe(
        'explore_search',
      );
    },
  );

  it('returns undefined when the active tab shows another host', () => {
    const state = buildState(
      [{ id: 1, url: 'https://metamask.io', entryPoint: 'explore_search' }],
      1,
    );

    expect(
      selectActiveTabEntryPointForOrigin(state, 'app.uniswap.org'),
    ).toBeUndefined();
  });

  it('only reads the active tab', () => {
    const state = buildState(
      [
        {
          id: 1,
          url: 'https://app.uniswap.org',
          entryPoint: 'explore_search',
        },
        { id: 2, url: 'https://app.uniswap.org' },
      ],
      2,
    );

    expect(
      selectActiveTabEntryPointForOrigin(state, 'app.uniswap.org'),
    ).toBeUndefined();
  });

  it('returns undefined when there is no active tab', () => {
    const state = buildState([], null);

    expect(
      selectActiveTabEntryPointForOrigin(state, 'app.uniswap.org'),
    ).toBeUndefined();
  });
});
