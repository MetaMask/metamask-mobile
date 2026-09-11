import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { PERPS_ACTIVITY_FILTER_ORDER, PerpsActivityFilter } from '../../types';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';
import { FilterOptionSheet } from '../FilterOptionSheet';

export const PERPS_ACTIVITY_FILTER_LABEL_KEY: Record<
  PerpsActivityFilter,
  string
> = {
  [PerpsActivityFilter.Trades]: 'activity_view.perps_filter.trades',
  [PerpsActivityFilter.Orders]: 'activity_view.perps_filter.order',
  [PerpsActivityFilter.Fundings]: 'activity_view.perps_filter.fundings',
  [PerpsActivityFilter.Deposits]: 'activity_view.perps_filter.deposits',
};

export interface PerpsActivityFilterSheetParams {
  selected: PerpsActivityFilter;
  onSelect: (filter: PerpsActivityFilter) => void;
}

export const createPerpsActivityFilterNavDetails =
  createNavigationDetails<PerpsActivityFilterSheetParams>(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.ACTIVITY_PERPS_FILTER,
  );

/**
 * Activity Perps sub-filter hosted on `ROOT_MODAL_FLOW` so it covers the tab
 * bar when Activity is a tab (money account off). Selection is written back via
 * a non-serializable `onSelect` callback in route params (OptionsSheet pattern).
 */
const PerpsActivityFilterSheet: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { selected, onSelect } = useParams<PerpsActivityFilterSheetParams>();

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <FilterOptionSheet
      title={strings('activity_view.perps_filter.title')}
      options={PERPS_ACTIVITY_FILTER_ORDER}
      selected={selected}
      getLabel={(filter) => strings(PERPS_ACTIVITY_FILTER_LABEL_KEY[filter])}
      onSelect={onSelect}
      onClose={() => undefined}
      goBack={handleGoBack}
      sheetTestID={ActivityScreenSelectorsIDs.PERPS_FILTER_SHEET}
      getOptionTestID={(filter) =>
        `${ActivityScreenSelectorsIDs.PERPS_FILTER_OPTION_PREFIX}${filter}`
      }
    />
  );
};

export default PerpsActivityFilterSheet;
