import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import I18n, { I18nEvents } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import type { UiSlotsLoadOutcome } from '../../../../core/Engine/controllers/ui-slots-controller/UiSlotsController';
import type { UiSlotsScreenId } from '../../../../core/Engine/controllers/ui-slots-controller/types';
import { selectBasicFunctionalityEnabledForRemoteFlags } from '../../../../selectors/featureFlagController';
import { selectUiSlotsEnabled } from '../../../../selectors/uiSlotsController';
import Logger from '../../../../util/Logger';

const INITIAL_RETRY_DELAY_MS = 60 * 1000;
const MAX_RETRY_DELAY_MS = 15 * 60 * 1000;

const isAppActive = () =>
  AppState.currentState !== 'background' &&
  AppState.currentState !== 'inactive';
const subscribeToLocale = (onLocaleChanged: () => void) => {
  I18nEvents.addListener('localeChanged', onLocaleChanged);
  return () => I18nEvents.removeListener('localeChanged', onLocaleChanged);
};
const getLocaleSnapshot = () => I18n.locale;

export const normalizeUiSlotsLocale = (locale: string): string => {
  const [language, ...subtags] = locale.replace(/_/gu, '-').split('-');
  return [
    (language || 'en').toLowerCase(),
    ...subtags.map((subtag) =>
      /^[a-z]{2}$/iu.test(subtag) ? subtag.toUpperCase() : subtag,
    ),
  ].join('-');
};

/**
 * Keeps a screen's remote slot assignment loaded while it is focused and the
 * app is foregrounded, revalidating once the controller's soft TTL expires.
 */
export function useUiSlotsScreen(
  screenId: UiSlotsScreenId,
  active = true,
): void {
  const selectedLocale = useSyncExternalStore(
    subscribeToLocale,
    getLocaleSnapshot,
    getLocaleSnapshot,
  );
  const locale = normalizeUiSlotsLocale(selectedLocale);
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
      if (!active || !enabled || !basicFunctionalityEnabled) {
        return undefined;
      }

      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let generation = 0;
      let retryDelay = INITIAL_RETRY_DELAY_MS;

      const clearTimer = () => {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
      };

      async function loadAndSchedule() {
        generation += 1;
        const currentGeneration = generation;
        clearTimer();
        if (!isAppActive()) {
          return;
        }

        let outcome: UiSlotsLoadOutcome;
        try {
          outcome = await Engine.context.UiSlotsController.loadScreen(
            screenId,
            locale,
          );
        } catch (error) {
          outcome = 'error' as const;
          Logger.error(
            error instanceof Error
              ? error
              : new Error('Failed to request UI Slots screen.'),
          );
        }

        if (cancelled || currentGeneration !== generation || !isAppActive()) {
          return;
        }

        // A stale outcome leaves the soft-TTL boundary in the past, so it must
        // back off rather than schedule off it, or a failing artifact would be
        // refetched, and reported, as fast as the network answers.
        if (outcome === 'error' || outcome === 'stale') {
          timer = setTimeout(
            () => loadAndSchedule().catch(Logger.error),
            retryDelay,
          );
          retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
          return;
        }

        retryDelay = INITIAL_RETRY_DELAY_MS;
        const nextRefreshAt = Engine.context.UiSlotsController.getNextRefreshAt(
          screenId,
          locale,
        );
        if (nextRefreshAt !== undefined) {
          timer = setTimeout(
            () => loadAndSchedule().catch(Logger.error),
            Math.max(nextRefreshAt - Date.now(), INITIAL_RETRY_DELAY_MS),
          );
        }
      }

      const appStateSubscription = AppState.addEventListener(
        'change',
        (nextState) => {
          if (nextState === 'active') {
            loadAndSchedule().catch(Logger.error);
          } else {
            generation += 1;
            clearTimer();
          }
        },
      );
      loadAndSchedule().catch(Logger.error);

      return () => {
        cancelled = true;
        generation += 1;
        clearTimer();
        appStateSubscription.remove();
      };
    }, [active, basicFunctionalityEnabled, enabled, locale, screenId]),
  );
}
