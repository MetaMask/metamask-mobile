import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
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
  type PerpsModeSelectionEntry,
  type PerpsModeSelectionRouteParams,
} from '../../utils/openPerpsModeSelection';
import {
  buildDefaultProMarket,
  toPerpsNavigatorScreenParams,
  useGetPerpsHomeNavigationTarget,
} from '../../utils/perpsModeSwitch';

type ModeSelectionRoute = RouteProp<
  { PerpsModeSelection: PerpsModeSelectionRouteParams },
  'PerpsModeSelection'
>;

/**
 * Host screen for the Lite/Pro chooser bottom sheet.
 *
 * Opened from the Trade menu (once) or from Perps header toggles. Selecting a
 * mode persists the choice and continues into the right destination — no
 * mode-switch flash overlay.
 */
const PerpsModeSelectionView: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<ModeSelectionRoute>();
  const entry: PerpsModeSelectionEntry = route.params?.entry ?? 'trade';
  const source =
    route.params?.source ?? PERPS_EVENT_VALUE.SOURCE.TRADE_MENU_ACTION;

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
                source,
                redirectScreen: Routes.PERPS.MARKET_DETAILS,
                redirectParams: {
                  market: buildDefaultProMarket(),
                  source,
                },
              }
            : { source },
        );
        return;
      }

      if (entry === 'home' && mode === PerpsMode.Pro) {
        // Modal is nested under the Perps stack when opened from home.
        // Reset that parent stack so Perps Home is discarded while Pro is
        // active (TAT-3612) — same behavior as the old direct header switch.
        navigation.getParent()?.reset({
          index: 0,
          routes: [
            {
              name: Routes.PERPS.MARKET_DETAILS,
              params: {
                market: buildDefaultProMarket(),
                source,
              },
            },
          ],
        });
        return;
      }

      if (entry === 'trade') {
        navigation.navigate(
          Routes.PERPS.ROOT,
          toPerpsNavigatorScreenParams(getPerpsHomeNavigationTarget()),
        );
      }

      // `home` + Lite and `market` entries: dismiss only — mode state update
      // remounts the correct Lite/Pro layout via existing routers.
    },
    [
      entry,
      getPerpsHomeNavigationTarget,
      isFirstTimePerpsUser,
      navigation,
      source,
    ],
  );

  const handleSelect = useCallback(
    async (mode: PerpsMode) => {
      setMode(mode);
      await markPerpsModeSelectionCompleted();

      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.MODE]: mode,
        [PERPS_EVENT_PROPERTY.SOURCE]: source,
      });

      // Home → Pro resets the parent Perps stack (clears the modal too).
      if (entry === 'home' && mode === PerpsMode.Pro && !isFirstTimePerpsUser) {
        continueAfterSelection(mode);
        return;
      }

      navigation.goBack();
      requestAnimationFrame(() => {
        continueAfterSelection(mode);
      });
    },
    [
      continueAfterSelection,
      entry,
      isFirstTimePerpsUser,
      navigation,
      setMode,
      source,
      track,
    ],
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
