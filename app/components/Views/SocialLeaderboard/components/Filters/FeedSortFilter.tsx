import {
  SelectButton,
  SelectButtonSize,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import FilterOptionSheet from './FilterOptionSheet';
import {
  FeedSortFilterSelectorsIDs,
  getFeedSortFilterOptionTestId,
} from './Filters.testIds';

export type FeedSort = 'most_recent' | 'popular';

export const FEED_SORT_OPTIONS: FeedSort[] = ['most_recent', 'popular'];

export const DEFAULT_FEED_SORT: FeedSort = 'most_recent';

const FEED_SORT_LABEL_KEY: Record<FeedSort, string> = {
  most_recent: 'social_leaderboard.feed_sort.most_recent',
  popular: 'social_leaderboard.feed_sort.popular',
};

const getFeedSortLabel = (value: FeedSort) =>
  strings(FEED_SORT_LABEL_KEY[value]);

export interface FeedSortFilterSelectorProps {
  value: FeedSort;
  onPress: () => void;
  testID?: string;
}

export const FeedSortFilterSelector: React.FC<FeedSortFilterSelectorProps> = ({
  value,
  onPress,
  testID = FeedSortFilterSelectorsIDs.SELECTOR,
}) => (
  <SelectButton
    size={SelectButtonSize.Md}
    placeholder={getFeedSortLabel(value)}
    value={getFeedSortLabel(value)}
    onPress={onPress}
    testID={testID}
  />
);

export interface FeedSortFilterSheetProps {
  isOpen: boolean;
  value: FeedSort;
  onChange: (value: FeedSort) => void;
  onClose: () => void;
}

export const FeedSortFilterSheet: React.FC<FeedSortFilterSheetProps> = ({
  isOpen,
  value,
  onChange,
  onClose,
}) => (
  <FilterOptionSheet
    isOpen={isOpen}
    title={strings('social_leaderboard.feed_sort.title')}
    options={FEED_SORT_OPTIONS}
    value={value}
    getLabel={getFeedSortLabel}
    onChange={onChange}
    onClose={onClose}
    sheetTestID={FeedSortFilterSelectorsIDs.SHEET}
    backdropTestID={FeedSortFilterSelectorsIDs.BACKDROP}
    getOptionTestID={getFeedSortFilterOptionTestId}
  />
);
