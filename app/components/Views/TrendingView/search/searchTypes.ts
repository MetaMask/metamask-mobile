import type { SearchFeedId } from './useExploreSearch';

export interface ListItemHeader {
  type: 'header';
  feedId: SearchFeedId;
  title: string;
  isFirstHeader: boolean;
}

export interface ListItemData {
  type: 'item';
  feedId: SearchFeedId;
  title: string;
  data: unknown;
  /** Position within the section, used for analytics. */
  sectionIndex: number;
}

export interface ListItemSkeleton {
  type: 'skeleton';
  feedId: SearchFeedId;
  index: number;
}

export type FlatListItem = ListItemHeader | ListItemData | ListItemSkeleton;
