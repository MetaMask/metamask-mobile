import { useNavigation } from '@react-navigation/native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  PerpsMode,
} from '@metamask/perps-controller';
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import PerpsModeSelectionBottomSheet from '../../components/PerpsModeSelectionBottomSheet';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsMode } from '../../hooks/usePerpsMode';
import { selectIsFirstTimePerpsUser } from '../../selectors/perpsController';
import { markPerpsModeSelectionCompleted } from '../../utils/perpsModeSelectionStorage';
import {
  buildDefaultProMarket,
  toPerpsNavigatorScreenParams,
  useGetPerpsHomeNavigationTarget,
} from '../../utils/perpsModeSwitch';

/**
 * Host screen for the Lite/Pro chooser bottom sheet.
 *
 * Shown once (persisted via {@link markPerpsModeSelectionCompleted}) when the
 * user enters Perps from the Trade menu while Pro mode is enabled. Selecting a
 * mode persists the choice and continues into the tutorial or Pro-aware home.
 */
const PerpsModeSelectionView: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { track } = usePerpsEventTracking();
  const { mode: selectedMode, setMode } = usePerpsMode();
  const isFirstTimePerpsUser = useSelector(selectIsFirstTimePerpsUser);
  const getPerpsHomeNavigationTarget = useGetPerpsHomeNavigationTarget();

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const continueAfterSelection = useCallback(
    (mode: PerpsMode) => {
      if (isFirstTimePerpsUser) {
        navigation.navigate(
          Routes.PERPS.TUTORIAL,
          mode === PerpsMode.Pro
            ? {
                source: PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
                redirectScreen: Routes.PERPS.MARKET_DETAILS,
                redirectParams: {
                  market: buildDefaultProMarket(),
                  source: PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
                },
              }
            : {
                source: PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
              },
        );
        return;
      }

      navigation.navigate(
        Routes.PERPS.ROOT,
        toPerpsNavigatorScreenParams(getPerpsHomeNavigationTarget()),
      );
    },
    [getPerpsHomeNavigationTarget, isFirstTimePerpsUser, navigation],
  );

  const handleSelect = useCallback(
    async (mode: PerpsMode) => {
      setMode(mode);
      await markPerpsModeSelectionCompleted();

      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.MODE]: mode,
        [PERPS_EVENT_PROPERTY.SOURCE]:
          PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION,
      });

      // Dismiss the modal stack, then continue so tutorial/home is not opened
      // underneath the transparent Perps modal.
      navigation.goBack();
      requestAnimationFrame(() => {
        continueAfterSelection(mode);
      });
    },
    [continueAfterSelection, navigation, setMode, track],
  );

  return (
    <PerpsModeSelectionBottomSheet
      selectedMode={selectedMode}
      onSelect={handleSelect}
      onClose={handleClose}
    />
  );
};

export default PerpsModeSelectionView;
