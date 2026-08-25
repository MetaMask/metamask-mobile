import type { Store } from '@reduxjs/toolkit';
import type { PerpsMode } from '@metamask/perps-controller';
import { strings } from '../../../locales/i18n';
import Engine from '../../../app/core/Engine';
import { updateBgState } from '../../../app/core/redux/slices/engine';

/**
 * Shared helpers for Perps component/view tests.
 * Add only what view tests need; use i18n (strings()) for any user-facing labels to stay consistent with the app.
 */

/** Labels from i18n (same keys as PerpsModifyActionSheet). Used by PerpsSelectModifyActionView.view.test. */
export function getModifyActionLabels() {
  return {
    title: strings('perps.modify.title'),
    addPosition: strings('perps.modify.add_to_position'),
    reducePosition: strings('perps.modify.reduce_position'),
    flipPosition: strings('perps.modify.flip_position'),
    close: strings('navigation.close'),
  };
}

interface EngineWithState {
  state?: Record<string, unknown>;
  context: typeof Engine.context;
}

type ProLayoutPreferencesPatch = Record<string, unknown>;

/**
 * Mirrors real PerpsController messengers so Pro preference / mode writes
 * update Redux selectors in component view tests.
 */
export function wirePerpsControllerForStore(store: Store): void {
  const perpsController = Engine.context.PerpsController as unknown as {
    setProLayoutPreferences: (prefs: ProLayoutPreferencesPatch) => void;
    setPerpsMode: (mode: PerpsMode) => void;
  };

  const syncPerpsControllerState = (
    patch: Record<string, unknown>,
  ): void => {
    const engineWithState = Engine as unknown as EngineWithState;
    const backgroundState = store.getState().engine.backgroundState as Record<
      string,
      unknown
    >;
    const existingPerps =
      (backgroundState.PerpsController as Record<string, unknown> | undefined) ??
      {};
    const existingEnginePerps =
      (engineWithState.state?.PerpsController as
        | Record<string, unknown>
        | undefined) ?? {};

    engineWithState.state = {
      ...(engineWithState.state ?? {}),
      PerpsController: {
        ...existingPerps,
        ...existingEnginePerps,
        ...patch,
      },
    };

    store.dispatch(updateBgState({ key: 'PerpsController' }));
  };

  perpsController.setProLayoutPreferences = jest.fn((prefs) => {
    const backgroundState = store.getState().engine.backgroundState as Record<
      string,
      unknown
    >;
    const existingPerps =
      (backgroundState.PerpsController as Record<string, unknown> | undefined) ??
      {};
    const existingPrefs =
      (existingPerps.proLayoutPreferences as
        | Record<string, unknown>
        | undefined) ?? {};

    syncPerpsControllerState({
      proLayoutPreferences: {
        ...existingPrefs,
        ...prefs,
      },
    });
  });

  perpsController.setPerpsMode = jest.fn((mode) => {
    syncPerpsControllerState({ mode });
  });
}
