import { useCallback, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import I18n, { I18nEvents } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import type { UiSlotsLoadOutcome } from '../../../../core/Engine/controllers/ui-slots-controller/UiSlotsController';
import type { UiSlotsScreenId } from '../../../../core/Engine/controllers/ui-slots-controller/types';
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
  const [language, ...subtags] = locale.replaceAll('_', '-').split('-');
  return [
    (language || 'en').toLowerCase(),
    ...subtags.map((subtag) => {
      if (/^[a-z]{4}$/iu.test(subtag)) {
        return `${subtag[0].toUpperCase()}${subtag.slice(1).toLowerCase()}`;
      }
      if (/^[a-z]{2}$/iu.test(subtag) || /^\d{3}$/u.test(subtag)) {
        return subtag.toUpperCase();
      }
      return subtag.toLowerCase();
    }),
  ].join('-');
};

/**
 * Keeps a screen's remote slot assignment loaded while it is focused and the
 * app is foregrounded, revalidating once the controller's soft TTL expires.
 */
export function useUiSlotsScreen(
  screenId: UiSlotsScreenId,
  active = true,
): () => Promise<UiSlotsLoadOutcome> {
  const selectedLocale = useSyncExternalStore(
    subscribeToLocale,
    getLocaleSnapshot,
    getLocaleSnapshot,
  );
  const locale = normalizeUiSlotsLocale(selectedLocale);
  const enabled = useSelector(selectUiSlotsEnabled);
  const refreshRef = useRef<() => Promise<UiSlotsLoadOutcome>>(() =>
    Promise.resolve('disabled'),
  );
  const refresh = useCallback(() => refreshRef.current(), []);

  useFocusEffect(
    useCallback(() => {
      if (!active || !enabled) {
        return undefined;
      }

      let timer: ReturnType<typeof setTimeout> | undefined;
      let generation = 0;
      let retryDelay = INITIAL_RETRY_DELAY_MS;

      const clearTimer = () => {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
      };

      async function loadAndSchedule(
        force = false,
      ): Promise<UiSlotsLoadOutcome> {
        generation += 1;
        const currentGeneration = generation;
        clearTimer();
        if (!isAppActive()) {
          return 'superseded';
        }

        const outcome = force
          ? await Engine.context.UiSlotsController.refreshScreen(
              screenId,
              locale,
            )
          : await Engine.context.UiSlotsController.loadScreen(screenId, locale);

        if (currentGeneration !== generation || !isAppActive()) {
          return 'superseded';
        }
        if (outcome === 'disabled' || outcome === 'superseded') {
          return outcome;
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
          return outcome;
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
        return outcome;
      }
      refreshRef.current = () => loadAndSchedule(true);

      const abortLoad = () => {
        generation += 1;
        clearTimer();
        Engine.context.UiSlotsController.cancelScreenLoad(screenId);
      };

      const appStateSubscription = AppState.addEventListener(
        'change',
        (nextState) => {
          if (nextState === 'active') {
            loadAndSchedule().catch(Logger.error);
          } else {
            abortLoad();
          }
        },
      );
      loadAndSchedule().catch(Logger.error);

      return () => {
        abortLoad();
        refreshRef.current = () => Promise.resolve('disabled');
        appStateSubscription.remove();
      };
    }, [active, enabled, locale, screenId]),
  );

  return refresh;
}
