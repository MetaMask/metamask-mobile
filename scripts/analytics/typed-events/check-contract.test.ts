import {
  flattenReleasePages,
  selectLatestAnalyticsRelease,
  type AnalyticsContractRelease,
} from './check-contract';

const createRelease = (
  tag: string,
  publishedAt: string,
): AnalyticsContractRelease => ({
  assets: [],
  publishedAt,
  tag,
  url: `https://github.com/Consensys/segment-schema/releases/tag/${tag}`,
});

describe('selectLatestAnalyticsRelease', () => {
  it('selects the newest analytics contract release', () => {
    const releases = [
      createRelease(
        'analytics-contracts-old',
        '2026-09-25T14:00:00.000Z',
      ),
      createRelease(
        'other-release',
        '2026-09-25T16:00:00.000Z',
      ),
      createRelease(
        'analytics-contracts-new',
        '2026-09-25T15:00:00.000Z',
      ),
    ];

    const result = selectLatestAnalyticsRelease(releases);

    expect(result.tag).toBe('analytics-contracts-new');
  });

  it('rejects a release list without analytics contract releases', () => {
    const releases = [createRelease('other-release', '2026-09-25T16:00:00.000Z')];

    expect(() => selectLatestAnalyticsRelease(releases)).toThrow(
      'No published releases with prefix',
    );
  });
});

describe('flattenReleasePages', () => {
  it('combines all paginated release pages', () => {
    const releases = [
      [{ tag_name: 'first' }],
      [{ tag_name: 'second' }],
    ];

    const result = flattenReleasePages(releases);

    expect(result).toEqual([{ tag_name: 'first' }, { tag_name: 'second' }]);
  });
});
