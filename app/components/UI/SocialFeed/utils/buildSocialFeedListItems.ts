import type { SocialFeedInlineRow } from '../components/SocialFeed.types';
import type { SocialV1FeedPost } from '../types';

/** One row of a virtualized feed: a post, a host row, or the empty state. */
export type SocialFeedListItem =
  | { kind: 'post'; post: SocialV1FeedPost }
  | { kind: 'inline'; row: SocialFeedInlineRow }
  | { kind: 'placeholder' };

/**
 * Splices host rows in after `afterIndex` posts, clamped to the end. Rows
 * sharing an index keep their given order.
 *
 * With no posts, the empty-state placeholder leads, then the host rows: the
 * list's own empty component stops rendering once the data is not empty.
 */
export const buildSocialFeedListItems = (
  posts: readonly SocialV1FeedPost[],
  inlineRows: readonly SocialFeedInlineRow[],
): SocialFeedListItem[] => {
  if (inlineRows.length === 0) {
    return posts.map((post): SocialFeedListItem => ({ kind: 'post', post }));
  }
  const rowsByPosition = new Map<number, SocialFeedListItem[]>();
  inlineRows.forEach((row) => {
    const position = Math.min(Math.max(row.afterIndex, 0), posts.length);
    rowsByPosition.set(position, [
      ...(rowsByPosition.get(position) ?? []),
      { kind: 'inline', row },
    ]);
  });
  const rowsAt = (position: number) => rowsByPosition.get(position) ?? [];

  if (posts.length === 0) {
    return [{ kind: 'placeholder' }, ...rowsAt(0)];
  }
  const items: SocialFeedListItem[] = [];
  posts.forEach((post, index) => {
    items.push(...rowsAt(index), { kind: 'post', post });
  });
  items.push(...rowsAt(posts.length));
  return items;
};

/** Stable key for a list row. Posts keep the key they had before rows mixed in. */
export const getSocialFeedListItemKey = (item: SocialFeedListItem): string => {
  switch (item.kind) {
    case 'post':
      return item.post.position?.positionId ?? item.post.id;
    case 'inline':
      return `inline-${item.row.key}`;
    case 'placeholder':
      return 'placeholder';
    default:
      return item satisfies never;
  }
};
