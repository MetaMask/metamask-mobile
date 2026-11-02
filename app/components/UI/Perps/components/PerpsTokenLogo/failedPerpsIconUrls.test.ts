import {
  clearFailedPerpsIconUrls,
  getFailedPerpsIconUrlRevision,
  recordFailedPerpsIconUrl,
  selectAvailablePerpsIconUrl,
} from './failedPerpsIconUrls';

const ICON_URLS = {
  primary: 'https://example.test/primary.svg',
  fallback: 'https://example.test/fallback.svg',
};

/**
 * Unit, not component-view: this is the pure revision contract React Compiler
 * needs. Jest does not run the compiler, so the tests call the selector with
 * an explicit revision instead of a rendered component.
 */
describe('selectAvailablePerpsIconUrl', () => {
  beforeEach(() => {
    clearFailedPerpsIconUrls();
  });

  it('keeps the primary url at a revision from before that url failed', () => {
    const revisionBeforeMiss = getFailedPerpsIconUrlRevision();

    const urlBeforeMiss = selectAvailablePerpsIconUrl(
      ICON_URLS,
      revisionBeforeMiss,
    );
    recordFailedPerpsIconUrl(ICON_URLS.primary);
    const revisionAfterMiss = getFailedPerpsIconUrlRevision();

    expect(urlBeforeMiss).toBe(ICON_URLS.primary);
    expect(selectAvailablePerpsIconUrl(ICON_URLS, revisionBeforeMiss)).toBe(
      ICON_URLS.primary,
    );
    expect(selectAvailablePerpsIconUrl(ICON_URLS, revisionAfterMiss)).toBe(
      ICON_URLS.fallback,
    );
  });

  it('returns null at the revision where both urls have failed', () => {
    const revisionBeforeMiss = getFailedPerpsIconUrlRevision();

    recordFailedPerpsIconUrl(ICON_URLS.primary);
    recordFailedPerpsIconUrl(ICON_URLS.fallback);
    const revisionAfterBothMisses = getFailedPerpsIconUrlRevision();

    expect(selectAvailablePerpsIconUrl(ICON_URLS, revisionBeforeMiss)).toBe(
      ICON_URLS.primary,
    );
    expect(
      selectAvailablePerpsIconUrl(ICON_URLS, revisionAfterBothMisses),
    ).toBeNull();
  });

  it('returns the primary url at the revision published when the cache is cleared', () => {
    recordFailedPerpsIconUrl(ICON_URLS.primary);
    const revisionAfterMiss = getFailedPerpsIconUrlRevision();

    clearFailedPerpsIconUrls();
    const revisionAfterClear = getFailedPerpsIconUrlRevision();

    expect(selectAvailablePerpsIconUrl(ICON_URLS, revisionAfterMiss)).toBe(
      ICON_URLS.fallback,
    );
    expect(selectAvailablePerpsIconUrl(ICON_URLS, revisionAfterClear)).toBe(
      ICON_URLS.primary,
    );
  });

  it('returns the fallback from a memo keyed on revision after a miss', () => {
    const revisionBeforeMiss = getFailedPerpsIconUrlRevision();
    const memoizedByIconUrls = memoizeSelection(() => 'icon-urls');
    const memoizedByRevision = memoizeSelection((_iconUrls, revision) =>
      String(revision),
    );

    expect(memoizedByIconUrls(ICON_URLS, revisionBeforeMiss)).toBe(
      ICON_URLS.primary,
    );
    expect(memoizedByRevision(ICON_URLS, revisionBeforeMiss)).toBe(
      ICON_URLS.primary,
    );

    recordFailedPerpsIconUrl(ICON_URLS.primary);
    const revisionAfterMiss = getFailedPerpsIconUrlRevision();

    expect(memoizedByIconUrls(ICON_URLS, revisionAfterMiss)).toBe(
      ICON_URLS.primary,
    );
    expect(memoizedByRevision(ICON_URLS, revisionAfterMiss)).toBe(
      ICON_URLS.fallback,
    );
    expect(selectAvailablePerpsIconUrl(ICON_URLS, revisionBeforeMiss)).toBe(
      ICON_URLS.primary,
    );
  });
});

/**
 * Simulates React Compiler memoization. A cache keyed only on icon URLs is the
 * stale result Bugbot reported. A cache keyed on revision must observe the miss.
 */
function memoizeSelection(
  keyOf: (iconUrls: typeof ICON_URLS, failedIconUrlRevision: number) => string,
): (
  iconUrls: typeof ICON_URLS,
  failedIconUrlRevision: number,
) => string | null {
  const cache = new Map<string, string | null>();

  return (iconUrls, failedIconUrlRevision) => {
    const key = keyOf(iconUrls, failedIconUrlRevision);
    if (cache.has(key)) {
      return cache.get(key) ?? null;
    }

    const selected = selectAvailablePerpsIconUrl(
      iconUrls,
      failedIconUrlRevision,
    );
    cache.set(key, selected);
    return selected;
  };
}
