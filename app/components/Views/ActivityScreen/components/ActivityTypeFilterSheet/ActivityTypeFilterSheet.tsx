import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
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
};

export interface ActivityTypeFilterSheetParams {
  selected: ActivityTypeFilter;
  onSelect: (filter: ActivityTypeFilter) => void;
}

export const createActivityTypeFilterNavDetails =
  createNavigationDetails<ActivityTypeFilterSheetParams>(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.ACTIVITY_TYPE_FILTER,
  );

/**
 * Activity Type filter hosted on `ROOT_MODAL_FLOW` so it covers the tab bar
 * when Activity is a tab (money account off). Selection is written back via a
 * non-serializable `onSelect` callback in route params (OptionsSheet pattern).
 */
const ActivityTypeFilterSheet: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { selected, onSelect } = useParams<ActivityTypeFilterSheetParams>();

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <FilterOptionSheet
      title={strings('activity_view.type_filter.title')}
      options={ACTIVITY_TYPE_FILTER_ORDER}
      selected={selected}
      getLabel={(filter) => strings(ACTIVITY_TYPE_FILTER_LABEL_KEY[filter])}
      onSelect={onSelect}
      onClose={() => undefined}
      goBack={handleGoBack}
      sheetTestID={ActivityScreenSelectorsIDs.TYPE_FILTER_SHEET}
      getOptionTestID={(filter) =>
        `${ActivityScreenSelectorsIDs.TYPE_FILTER_OPTION_PREFIX}${filter}`
      }
    />
  );
};

export default ActivityTypeFilterSheet;
