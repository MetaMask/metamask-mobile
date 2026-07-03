import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { ACTIVITY_TYPE_FILTER_ORDER, ActivityTypeFilter } from '../../types';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';
import { FilterOptionSheet } from '../FilterOptionSheet';

export const ACTIVITY_TYPE_FILTER_LABEL_KEY: Record<
  ActivityTypeFilter,
  string
> = {
  // `All` is not currently selectable from the sheet — see the TODO above
  // `ACTIVITY_TYPE_FILTER_ORDER` in ../../types.ts. Kept for type completeness
  // and so chip labels keep resolving if the flag is re-enabled.
  [ActivityTypeFilter.All]: 'activity_view.type_filter.all',
  [ActivityTypeFilter.Transactions]: 'activity_view.type_filter.transactions',
  [ActivityTypeFilter.BuySell]: 'activity_view.type_filter.buy_sell',
  [ActivityTypeFilter.Perps]: 'activity_view.type_filter.perps',
  [ActivityTypeFilter.Predictions]: 'activity_view.type_filter.predictions',
  [ActivityTypeFilter.MetamaskCard]: 'activity_view.type_filter.metamask_card',
  [ActivityTypeFilter.Money]: 'activity_view.type_filter.money',
};

export interface ActivityTypeFilterSheetProps {
  selected: ActivityTypeFilter;
  onSelect: (filter: ActivityTypeFilter) => void;
  onClose: () => void;
}

const ActivityTypeFilterSheet: React.FC<ActivityTypeFilterSheetProps> = ({
  selected,
  onSelect,
  onClose,
}) => (
  <FilterOptionSheet
    title={strings('activity_view.type_filter.title')}
    options={ACTIVITY_TYPE_FILTER_ORDER}
    selected={selected}
    getLabel={(filter) => strings(ACTIVITY_TYPE_FILTER_LABEL_KEY[filter])}
    onSelect={onSelect}
    onClose={onClose}
    sheetTestID={ActivityScreenSelectorsIDs.TYPE_FILTER_SHEET}
    getOptionTestID={(filter) =>
      `${ActivityScreenSelectorsIDs.TYPE_FILTER_OPTION_PREFIX}${filter}`
    }
  />
);

export default ActivityTypeFilterSheet;
