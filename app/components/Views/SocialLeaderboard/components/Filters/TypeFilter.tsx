import {
  SelectButton,
  SelectButtonSize,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import FilterOptionSheet from './FilterOptionSheet';
import { TYPE_FILTER_LABEL_KEY, TYPE_FILTER_OPTIONS } from './filterOptions';
import {
  TypeFilterSelectorsIDs,
  getTypeFilterOptionTestId,
} from './Filters.testIds';
import type { SocialTypeFilter } from './types';

const getTypeFilterLabel = (value: SocialTypeFilter) =>
  strings(TYPE_FILTER_LABEL_KEY[value]);

export interface TypeFilterSelectorProps {
  value: SocialTypeFilter;
  onPress: () => void;
  testID?: string;
}

/**
 * "Type" pill that opens the {@link TypeFilterSheet}. Shared by the leaderboard
 * (`TopTradersView`) and the feed (`FeedView`); the sheet is rendered by the
 * host screen so it anchors to the screen bottom rather than to this row.
 *
 * `all` is the unfiltered default, so it reads as the "Type" placeholder rather
 * than as a selected value.
 */
export const TypeFilterSelector: React.FC<TypeFilterSelectorProps> = ({
  value,
  onPress,
  testID = TypeFilterSelectorsIDs.SELECTOR,
}) => (
  <SelectButton
    size={SelectButtonSize.Md}
    placeholder={strings('social_leaderboard.type_filter.placeholder')}
    value={value === 'all' ? null : getTypeFilterLabel(value)}
    onPress={onPress}
    testID={testID}
  />
);

export interface TypeFilterSheetProps {
  isOpen: boolean;
  value: SocialTypeFilter;
  onChange: (value: SocialTypeFilter) => void;
  onClose: () => void;
  sheetTestID?: string;
  backdropTestID?: string;
  getOptionTestID?: (value: SocialTypeFilter) => string;
}

/** Bottom sheet with the position-type options (All types / Tokens / Perps). */
export const TypeFilterSheet: React.FC<TypeFilterSheetProps> = ({
  isOpen,
  value,
  onChange,
  onClose,
  sheetTestID = TypeFilterSelectorsIDs.SHEET,
  backdropTestID = TypeFilterSelectorsIDs.BACKDROP,
  getOptionTestID = getTypeFilterOptionTestId,
}) => (
  <FilterOptionSheet
    isOpen={isOpen}
    title={strings('social_leaderboard.type_filter.title')}
    options={TYPE_FILTER_OPTIONS}
    value={value}
    getLabel={getTypeFilterLabel}
    onChange={onChange}
    onClose={onClose}
    sheetTestID={sheetTestID}
    backdropTestID={backdropTestID}
    getOptionTestID={getOptionTestID}
  />
);
