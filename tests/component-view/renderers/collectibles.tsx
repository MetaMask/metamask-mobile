import '../mocks';
import type { RootState } from '../../../app/reducers';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import Routes from '../../../app/constants/navigation/Routes';
import type Engine from '../../../app/core/Engine';
import {
  CollectiblesLayout,
  collectiblesRoutes,
} from '../../../app/components/UI/Collectibles';
import Homepage from '../../../app/components/Views/Homepage/Homepage';
import { createEngineStateHarness } from '../helpers/createEngineStateHarness';
import { initialStateCollectibles } from '../presets/collectibles';
import { renderScreenWithRoutes } from '../render';

/** Exercises the homepage entry points through the actual Collectibles stack. */
export const renderHomepageWithCollectibles = (
  overrides?: DeepPartial<RootState>,
) => {
  const state = initialStateCollectibles();
  if (overrides) {
    state.withOverrides(overrides);
  }
  return renderScreenWithRoutes(
    Homepage,
    { name: Routes.WALLET_VIEW },
    [{ name: collectiblesRoutes.root, Component: CollectiblesLayout }],
    { state: state.build() },
  );
};

/**
 * Delivers a live flag update through the Engine-to-Redux boundary.
 * Preserves other flags and controller metadata. Call cleanup in finally so the
 * Engine mock is restored even when an assertion fails, including between OS runs.
 *
 * @param store - Store returned by the Collectibles renderer.
 * @returns Flag setter and cleanup restoring the previous Engine state.
 */
export const createCollectiblesFlagHarness = (
  store: ReturnType<typeof renderHomepageWithCollectibles>['store'],
) => {
  const { publish, cleanup } = createEngineStateHarness(
    store,
    'RemoteFeatureFlagController',
  );

  const setEnabled = (enabled: boolean) => {
    const flagState: typeof Engine.state.RemoteFeatureFlagController =
      store.getState().engine.backgroundState.RemoteFeatureFlagController;
    publish({
      ...flagState,
      remoteFeatureFlags: {
        ...flagState.remoteFeatureFlags,
        collectiblesEnabled: { enabled, minimumVersion: '0.0.1' },
      },
    });
  };

  return { setEnabled, cleanup };
};
