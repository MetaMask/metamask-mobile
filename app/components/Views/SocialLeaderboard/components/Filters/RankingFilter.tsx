import {
  SelectButton,
  SelectButtonSize,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import FilterOptionSheet from './FilterOptionSheet';
import {
  V1_LEADERBOARD_RANKING_LABEL_KEY,
  V1_LEADERBOARD_RANKING_OPTIONS,
  type V1LeaderboardRanking,
} from './filterOptions';
import {
  RankingFilterSelectorsIDs,
  getRankingFilterOptionTestId,
} from './Filters.testIds';

const getRankingLabel = (value: V1LeaderboardRanking) =>
  strings(V1_LEADERBOARD_RANKING_LABEL_KEY[value]);

export interface RankingFilterSelectorProps {
  value: V1LeaderboardRanking;
  onPress: () => void;
  testID?: string;
}

export const RankingFilterSelector: React.FC<RankingFilterSelectorProps> = ({
  value,
  onPress,
  testID = RankingFilterSelectorsIDs.SELECTOR,
}) => (
  <SelectButton
    size={SelectButtonSize.Md}
    placeholder={getRankingLabel(value)}
    value={getRankingLabel(value)}
    onPress={onPress}
    testID={testID}
  />
);

export interface RankingFilterSheetProps {
  isOpen: boolean;
  value: V1LeaderboardRanking;
  onChange: (value: V1LeaderboardRanking) => void;
  onClose: () => void;
  sheetTestID?: string;
  backdropTestID?: string;
  getOptionTestID?: (value: V1LeaderboardRanking) => string;
}

export const RankingFilterSheet: React.FC<RankingFilterSheetProps> = ({
  isOpen,
  value,
  onChange,
  onClose,
  sheetTestID = RankingFilterSelectorsIDs.SHEET,
  backdropTestID = RankingFilterSelectorsIDs.BACKDROP,
  getOptionTestID = getRankingFilterOptionTestId,
}) => (
  <FilterOptionSheet
    isOpen={isOpen}
    title={strings('social_leaderboard.sort_filter.title')}
    options={V1_LEADERBOARD_RANKING_OPTIONS}
    value={value}
    getLabel={getRankingLabel}
    onChange={onChange}
    onClose={onClose}
    sheetTestID={sheetTestID}
    backdropTestID={backdropTestID}
    getOptionTestID={getOptionTestID}
  />
);
