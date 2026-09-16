import {
  SelectButton,
  SelectButtonSize,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import FilterOptionSheet from './FilterOptionSheet';
import {
  LEADERBOARD_COHORT_LABEL_KEY,
  LEADERBOARD_COHORT_LEADING_EMOJI,
  LEADERBOARD_COHORT_OPTIONS,
  type LeaderboardTraderCohort,
} from './filterOptions';
import {
  CohortFilterSelectorsIDs,
  getCohortFilterOptionTestId,
} from './Filters.testIds';

const getCohortLabel = (value: LeaderboardTraderCohort) =>
  strings(LEADERBOARD_COHORT_LABEL_KEY[value]);

const getCohortSheetLabel = (value: LeaderboardTraderCohort) => {
  const label = getCohortLabel(value);
  const emoji = LEADERBOARD_COHORT_LEADING_EMOJI[value];
  return emoji ? `${emoji} ${label}` : label;
};

export interface CohortFilterSelectorProps {
  value: LeaderboardTraderCohort;
  onPress: () => void;
  testID?: string;
}

export const CohortFilterSelector: React.FC<CohortFilterSelectorProps> = ({
  value,
  onPress,
  testID = CohortFilterSelectorsIDs.SELECTOR,
}) => (
  <SelectButton
    size={SelectButtonSize.Md}
    placeholder={getCohortLabel(value)}
    value={getCohortLabel(value)}
    onPress={onPress}
    testID={testID}
  />
);

export interface CohortFilterSheetProps {
  isOpen: boolean;
  value: LeaderboardTraderCohort;
  onChange: (value: LeaderboardTraderCohort) => void;
  onClose: () => void;
  sheetTestID?: string;
  backdropTestID?: string;
  getOptionTestID?: (value: LeaderboardTraderCohort) => string;
}

export const CohortFilterSheet: React.FC<CohortFilterSheetProps> = ({
  isOpen,
  value,
  onChange,
  onClose,
  sheetTestID = CohortFilterSelectorsIDs.SHEET,
  backdropTestID = CohortFilterSelectorsIDs.BACKDROP,
  getOptionTestID = getCohortFilterOptionTestId,
}) => (
  <FilterOptionSheet
    isOpen={isOpen}
    title={strings('social_leaderboard.cohort_filter.title')}
    options={LEADERBOARD_COHORT_OPTIONS}
    value={value}
    getLabel={getCohortSheetLabel}
    onChange={onChange}
    onClose={onClose}
    sheetTestID={sheetTestID}
    backdropTestID={backdropTestID}
    getOptionTestID={getOptionTestID}
  />
);
