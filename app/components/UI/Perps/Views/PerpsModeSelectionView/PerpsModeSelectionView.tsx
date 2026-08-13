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
import React, { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import PerpsModeSelectionBottomSheet from '../../components/PerpsModeSelectionBottomSheet';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsMode } from '../../hooks/usePerpsMode';
import { selectIsFirstTimePerpsUser } from '../../selectors/perpsController';
import { selectPerpsProModeEnabledFlag } from '../../selectors/featureFlags';
import { markPerpsModeSelectionCompleted } from '../../utils/perpsModeSelectionStorage';
import { PERPS_MODE_ANALYTICS_PROPERTY } from '../../utils/perpsModeAnalytics';
import {
  type PerpsModeSelectionEntry,
  type PerpsModeSelectionRouteParams,
  PERPS_MODE_SELECTION_DISMISSED,
  PERPS_MODE_SELECTION_SCREEN_TYPE,
} from '../../utils/openPerpsModeSelection';
import {
  buildDefaultProMarket,
  dropPerpsHomeFromStackHistory,
  resolvePerpsHomeNavigationTarget,
  toPerpsNavigatorScreenParams,
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

  const { track } = usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: PERPS_MODE_SELECTION_SCREEN_TYPE,
      [PERPS_EVENT_PROPERTY.SOURCE]: source,
      entry,
    },
  });
  const { mode: selectedMode, setMode } = usePerpsMode();
  const isFirstTimePerpsUser = useSelector(selectIsFirstTimePerpsUser);
  const isProModeEnabled = useSelector(selectPerpsProModeEnabledFlag);

  const hasSelectedRef = useRef(false);
  const dismissEmittedRef = useRef(false);
  const openedAtRef = useRef(Date.now());

  const emitDismissIfNeeded = useCallback(() => {
    if (hasSelectedRef.current || dismissEmittedRef.current) {
      return;
    }
    dismissEmittedRef.current = true;
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]: PERPS_MODE_SELECTION_DISMISSED,
      [PERPS_EVENT_PROPERTY.SOURCE]: source,
      [PERPS_EVENT_PROPERTY.TIME_ON_SCREEN_MS]:
        Date.now() - openedAtRef.current,
      entry,
    });
  }, [entry, source, track]);

  // Cover swipe / hardware back / programmatic goBack without a Lite/Pro pick.
  // Selection sets hasSelectedRef first so select → goBack is not counted as dismiss.
  useEffect(() => {
    openedAtRef.current = Date.now();
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      emitDismissIfNeeded();
    });
    return unsubscribe;
  }, [emitDismissIfNeeded, navigation]);

  const handleClose = useCallback(() => {
    // Sheet dismiss (X / backdrop / swipe) — beforeRemove also fires after goBack;
    // emit here so dismiss is recorded even if navigation teardown is odd.
    emitDismissIfNeeded();
    navigation.goBack();
  }, [emitDismissIfNeeded, navigation]);

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
        // Derive the destination from the mode just selected, not from the
        // Pro-mode selector: `setMode` has run but this closure still holds the
        // pre-selection render's value, so reading it back would send a user who
        // picked Pro to Lite Home.
        navigation.navigate(
          Routes.PERPS.ROOT,
          toPerpsNavigatorScreenParams(
            resolvePerpsHomeNavigationTarget(
              isProModeEnabled && mode === PerpsMode.Pro,
              { source },
            ),
          ),
        );
        return;
      }

      if (entry === 'market' && mode === PerpsMode.Pro) {
        // Modal is nested under the Perps stack when opened from a market.
        // Drop Home from that parent so back cannot reveal the Lite hub while
        // Pro is active (TAT-3612). Mode remount stays in place via the router.
        const perpsStack = navigation.getParent();
        if (perpsStack) {
          dropPerpsHomeFromStackHistory(perpsStack);
        }
      }

      // `home` + Lite: dismiss only — already on Perps Home.
    },
    [entry, isFirstTimePerpsUser, isProModeEnabled, navigation, source],
  );

  const handleSelect = useCallback(
    async (mode: PerpsMode) => {
      hasSelectedRef.current = true;
      setMode(mode);
      await markPerpsModeSelectionCompleted();

      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_MODE_ANALYTICS_PROPERTY]: mode,
        [PERPS_EVENT_PROPERTY.SOURCE]: source,
        entry,
      });

      // Home → Pro resets the parent Perps stack (clears the modal too).
      if (entry === 'home' && mode === PerpsMode.Pro && !isFirstTimePerpsUser) {
        continueAfterSelection(mode);
        return;
      }

      // Market → Pro must drop Home while the modal is still nested under the
      // Perps stack — after goBack the parent relationship is gone.
      if (
        entry === 'market' &&
        mode === PerpsMode.Pro &&
        !isFirstTimePerpsUser
      ) {
        continueAfterSelection(mode);
        navigation.goBack();
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
