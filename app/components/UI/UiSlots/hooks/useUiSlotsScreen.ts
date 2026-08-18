import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import I18n from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import type { UiSlotsScreenId } from '../../../../core/Engine/controllers/ui-slots-controller/types';
import { selectBasicFunctionalityEnabledForRemoteFlags } from '../../../../selectors/featureFlagController';
import { selectUiSlotsEnabled } from '../../../../selectors/uiSlotsController';
import Logger from '../../../../util/Logger';

const MINIMUM_RETRY_DELAY_MS = 60 * 1000;
const isAppActive = () =>
  AppState.currentState !== 'background' &&
  AppState.currentState !== 'inactive';

export function useUiSlotsScreen(screenId: UiSlotsScreenId): void {
  const locale = I18n.locale;
  const enabled = useSelector(selectUiSlotsEnabled);
  const basicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabledForRemoteFlags,
  );

  useEffect(() => {
    Engine.context.UiSlotsController.setBasicFunctionalityEnabled(
      basicFunctionalityEnabled,
    );
  }, [basicFunctionalityEnabled]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !basicFunctionalityEnabled) {
        return undefined;
      }

      let cancelled = false;
      let refreshTimer: ReturnType<typeof setTimeout> | undefined;
      let boundaryTimer: ReturnType<typeof setTimeout> | undefined;
      let generation = 0;

      const clearTimers = () => {
        if (refreshTimer) {
          clearTimeout(refreshTimer);
          refreshTimer = undefined;
        }
        if (boundaryTimer) {
          clearTimeout(boundaryTimer);
          boundaryTimer = undefined;
        }
      };

      function scheduleTimers() {
        clearTimers();
        if (cancelled || !isAppActive()) {
          return;
        }

        const nextRefreshAt = Engine.context.UiSlotsController.getNextRefreshAt(
          screenId,
          locale,
        );
        const refreshRemaining =
          nextRefreshAt === undefined
            ? MINIMUM_RETRY_DELAY_MS
            : nextRefreshAt - Date.now();
        refreshTimer = setTimeout(
          () => loadAndSchedule().catch(Logger.error),
          refreshRemaining > 0 ? refreshRemaining : MINIMUM_RETRY_DELAY_MS,
        );

        const nextBoundaryAt =
          Engine.context.UiSlotsController.getNextContentBoundaryAt(
            screenId,
            locale,
          );
        if (nextBoundaryAt !== undefined) {
          boundaryTimer = setTimeout(
            () => loadAndSchedule().catch(Logger.error),
            Math.max(0, nextBoundaryAt - Date.now()),
          );
        }
      }

      async function loadAndSchedule() {
        generation += 1;
        const currentGeneration = generation;
        clearTimers();
        if (!isAppActive()) {
          return;
        }

        Engine.context.UiSlotsController.evaluateScreen(screenId, locale);
        scheduleTimers();

        try {
          await Engine.context.UiSlotsController.loadScreen(screenId, locale);
        } catch (error) {
          Logger.error(
            error instanceof Error
              ? error
              : new Error('Failed to request UI Slots screen.'),
          );
        }

        if (cancelled || currentGeneration !== generation) {
          return;
        }
        scheduleTimers();
      }

      const appStateSubscription = AppState.addEventListener(
        'change',
        (nextState) => {
          if (nextState === 'active') {
            loadAndSchedule().catch(Logger.error);
          } else {
            generation += 1;
            clearTimers();
          }
        },
      );
      loadAndSchedule().catch(Logger.error);

      return () => {
        cancelled = true;
        generation += 1;
        clearTimers();
        appStateSubscription.remove();
      };
    }, [basicFunctionalityEnabled, enabled, locale, screenId]),
  );
}
