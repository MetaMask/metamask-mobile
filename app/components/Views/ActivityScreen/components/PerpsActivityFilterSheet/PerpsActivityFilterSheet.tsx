import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { PERPS_ACTIVITY_FILTER_ORDER, PerpsActivityFilter } from '../../types';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';
import { FilterOptionSheet } from '../FilterOptionSheet';

export const PERPS_ACTIVITY_FILTER_LABEL_KEY: Record<
  PerpsActivityFilter,
  string
> = {
  [PerpsActivityFilter.Trades]: 'activity_view.perps_filter.trades',
  [PerpsActivityFilter.Order]: 'activity_view.perps_filter.order',
  [PerpsActivityFilter.Fundings]: 'activity_view.perps_filter.fundings',
  [PerpsActivityFilter.Deposits]: 'activity_view.perps_filter.deposits',
};

export interface PerpsActivityFilterSheetProps {
  selected: PerpsActivityFilter;
  onSelect: (filter: PerpsActivityFilter) => void;
  onClose: () => void;
}

const PerpsActivityFilterSheet: React.FC<PerpsActivityFilterSheetProps> = ({
  selected,
  onSelect,
  onClose,
}) => (
  <FilterOptionSheet
    title={strings('activity_view.perps_filter.title')}
    options={PERPS_ACTIVITY_FILTER_ORDER}
    selected={selected}
    getLabel={(filter) => strings(PERPS_ACTIVITY_FILTER_LABEL_KEY[filter])}
    onSelect={onSelect}
    onClose={onClose}
    sheetTestID={ActivityScreenSelectorsIDs.PERPS_FILTER_SHEET}
    getOptionTestID={(filter) =>
      `${ActivityScreenSelectorsIDs.PERPS_FILTER_OPTION_PREFIX}${filter}`
    }
  />
);

export default PerpsActivityFilterSheet;
