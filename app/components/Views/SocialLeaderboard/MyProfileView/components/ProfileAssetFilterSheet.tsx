import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import FilterOptionSheet from '../../components/Filters/FilterOptionSheet';
import { TYPE_LABEL_KEY } from '../../shell/filters/filterDefaults';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import type { ProfileAssetFilter } from '../utils/splitPositionsByType';

const ASSET_FILTER_IDS: readonly ProfileAssetFilter[] = [
  'all',
  'tokens',
  'perps',
];

const getAssetFilterLabel = (value: ProfileAssetFilter) =>
  strings(TYPE_LABEL_KEY[value]);

const getAssetFilterOptionTestId = (value: ProfileAssetFilter) =>
  `${MyProfileViewSelectorsIDs.ASSET_FILTER}-${value}`;

export interface ProfileAssetFilterSheetProps {
  value: ProfileAssetFilter;
  onApply: (value: ProfileAssetFilter) => void;
  onClose: () => void;
}

/**
 * Asset-type sheet for the profile tabs. Selecting a row applies it and
 * closes, matching the crypto movers time list.
 */
const ProfileAssetFilterSheet: React.FC<ProfileAssetFilterSheetProps> = ({
  value,
  onApply,
  onClose,
}) => (
  <FilterOptionSheet
    isOpen
    title={strings('social_leaderboard.shell.filters.section.asset_type')}
    options={ASSET_FILTER_IDS}
    value={value}
    getLabel={getAssetFilterLabel}
    onChange={onApply}
    onClose={onClose}
    sheetTestID={MyProfileViewSelectorsIDs.ASSET_FILTER_SHEET}
    backdropTestID={MyProfileViewSelectorsIDs.ASSET_FILTER_BACKDROP}
    getOptionTestID={getAssetFilterOptionTestId}
  />
);

export default ProfileAssetFilterSheet;
