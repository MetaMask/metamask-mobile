import { mockPerpFeedItem } from '../mocks/coreFeed.mock';
import { mockOpenPerpsFeedItem } from '../mocks/socialV1Feed.mock';
import type { SocialFeedInlineRow } from '../components/SocialFeed.types';
import type { SocialV1FeedPost } from '../types';
import {
  buildSocialFeedListItems,
  getSocialFeedListItemKey,
  type SocialFeedListItem,
} from './buildSocialFeedListItems';

const post = (id: string): SocialV1FeedPost => ({
  id,
  authorHandle: 'ada',
  timestampMs: 1,
  reactions: [],
  item: mockOpenPerpsFeedItem({ id }),
});

const row = (key: string, afterIndex: number): SocialFeedInlineRow => ({
  key,
  afterIndex,
  render: () => null,
});

const keys = (items: SocialFeedListItem[]) =>
  items.map(getSocialFeedListItemKey);

describe('buildSocialFeedListItems', () => {
  const posts = [post('one'), post('two'), post('three')];

  it('lists only the posts without inline rows', () => {
    expect(keys(buildSocialFeedListItems(posts, []))).toEqual([
      'one',
      'two',
      'three',
    ]);
  });

  it('places a row after the given number of posts', () => {
    expect(keys(buildSocialFeedListItems(posts, [row('rail', 1)]))).toEqual([
      'one',
      'inline-rail',
      'two',
      'three',
    ]);
  });

  it('clamps a row past the last post to the end and a negative index to the start', () => {
    const items = buildSocialFeedListItems(posts, [
      row('late', 10),
      row('early', -2),
    ]);

    expect(keys(items)).toEqual([
      'inline-early',
      'one',
      'two',
      'three',
      'inline-late',
    ]);
  });

  it('keeps the given order for rows at the same position', () => {
    const items = buildSocialFeedListItems(posts, [
      row('first', 2),
      row('second', 2),
    ]);

    expect(keys(items)).toEqual([
      'one',
      'two',
      'inline-first',
      'inline-second',
      'three',
    ]);
  });

  it('leads with the placeholder when there are no posts', () => {
    expect(keys(buildSocialFeedListItems([], [row('rail', 3)]))).toEqual([
      'placeholder',
      'inline-rail',
    ]);
  });

  it('keys a post with a position by its position id', () => {
    const [item] = buildSocialFeedListItems(
      [
        {
          ...post('one'),
          position: mockPerpFeedItem({ positionId: 'position-1' }),
        },
      ],
      [],
    );

    expect(getSocialFeedListItemKey(item)).toBe('position-1');
  });
});
