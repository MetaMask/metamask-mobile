import {
  SelectButton,
  SelectButtonSize,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import FilterOptionSheet from './FilterOptionSheet';
import { TIMEFRAME_LABEL_KEY, TIMEFRAME_OPTIONS } from './filterOptions';
import {
  TimeframeFilterSelectorsIDs,
  getTimeframeFilterOptionTestId,
} from './Filters.testIds';
import type { SocialTimeframe } from './types';

const getTimeframeLabel = (value: SocialTimeframe) =>
  strings(TIMEFRAME_LABEL_KEY[value]);

export interface TimeframeFilterSelectorProps {
  value: SocialTimeframe;
  onPress: () => void;
  testID?: string;
}

/**
 * "7D / 30D" pill that opens the {@link TimeframeFilterSheet}. Every window is
 * a real selection (there is no unfiltered state), so the current value is the
 * label rather than a placeholder.
 */
export const TimeframeFilterSelector: React.FC<
  TimeframeFilterSelectorProps
> = ({ value, onPress, testID = TimeframeFilterSelectorsIDs.SELECTOR }) => (
  <SelectButton
    size={SelectButtonSize.Md}
    placeholder={getTimeframeLabel(value)}
    onPress={onPress}
    testID={testID}
  />
);

export interface TimeframeFilterSheetProps {
  isOpen: boolean;
  value: SocialTimeframe;
  onChange: (value: SocialTimeframe) => void;
  onClose: () => void;
  sheetTestID?: string;
  backdropTestID?: string;
  getOptionTestID?: (value: SocialTimeframe) => string;
}

/** Bottom sheet with the trailing-window options (7D / 30D). */
export const TimeframeFilterSheet: React.FC<TimeframeFilterSheetProps> = ({
  isOpen,
  value,
  onChange,
  onClose,
  sheetTestID = TimeframeFilterSelectorsIDs.SHEET,
  backdropTestID = TimeframeFilterSelectorsIDs.BACKDROP,
  getOptionTestID = getTimeframeFilterOptionTestId,
}) => (
  <FilterOptionSheet
    isOpen={isOpen}
    title={strings('social_leaderboard.timeframe_filter.title')}
    options={TIMEFRAME_OPTIONS}
    value={value}
    getLabel={getTimeframeLabel}
    onChange={onChange}
    onClose={onClose}
    sheetTestID={sheetTestID}
    backdropTestID={backdropTestID}
    getOptionTestID={getOptionTestID}
  />
);
