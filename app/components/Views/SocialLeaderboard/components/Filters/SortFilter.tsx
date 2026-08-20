import {
  Icon,
  IconName,
  IconSize,
  SelectButton,
  SelectButtonSize,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import FilterOptionSheet from './FilterOptionSheet';
import {
  LEADERBOARD_SORT_LABEL_KEY,
  LEADERBOARD_SORT_OPTIONS,
} from './filterOptions';
import {
  SortFilterSelectorsIDs,
  getSortFilterOptionTestId,
} from './Filters.testIds';
import type { LeaderboardSort } from './types';

const getSortLabel = (value: LeaderboardSort) =>
  strings(LEADERBOARD_SORT_LABEL_KEY[value]);

export interface SortFilterSelectorProps {
  value: LeaderboardSort;
  onPress: () => void;
  testID?: string;
}

/**
 * "Sort by" pill on the leaderboard. Carries a leading sort glyph instead of a
 * trailing chevron so it reads as a ranking control rather than another filter,
 * but keeps the same pill styling as the Type / Time frame selectors.
 */
export const SortFilterSelector: React.FC<SortFilterSelectorProps> = ({
  value,
  onPress,
  testID = SortFilterSelectorsIDs.SELECTOR,
}) => (
  <SelectButton
    size={SelectButtonSize.Md}
    placeholder={getSortLabel(value)}
    startAccessory={<Icon name={IconName.SwapVertical} size={IconSize.Sm} />}
    hideEndArrow
    onPress={onPress}
    testID={testID}
  />
);

export interface SortFilterSheetProps {
  isOpen: boolean;
  value: LeaderboardSort;
  onChange: (value: LeaderboardSort) => void;
  onClose: () => void;
  sheetTestID?: string;
  backdropTestID?: string;
  getOptionTestID?: (value: LeaderboardSort) => string;
}

/** Bottom sheet with the leaderboard ranking metrics (P&L / P&L % / Win rate). */
export const SortFilterSheet: React.FC<SortFilterSheetProps> = ({
  isOpen,
  value,
  onChange,
  onClose,
  sheetTestID = SortFilterSelectorsIDs.SHEET,
  backdropTestID = SortFilterSelectorsIDs.BACKDROP,
  getOptionTestID = getSortFilterOptionTestId,
}) => (
  <FilterOptionSheet
    isOpen={isOpen}
    title={strings('social_leaderboard.sort_filter.title')}
    options={LEADERBOARD_SORT_OPTIONS}
    value={value}
    getLabel={getSortLabel}
    onChange={onChange}
    onClose={onClose}
    sheetTestID={sheetTestID}
    backdropTestID={backdropTestID}
    getOptionTestID={getOptionTestID}
  />
);
