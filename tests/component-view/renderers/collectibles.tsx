import '../mocks';
import React from 'react';
import type { RootState } from '../../../app/reducers';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import Routes from '../../../app/constants/navigation/Routes';
import Engine from '../../../app/core/Engine';
import { updateBgState } from '../../../app/core/redux/slices/engine';
import CollectiblesScreenStack from '../../../app/components/UI/Collectibles/routes';
import CollectiblesSection from '../../../app/components/Views/Homepage/Sections/Collectibles';
import { initialStateCollectibles } from '../presets/collectibles';
import { renderScreenWithRoutes } from '../render';

const HomepageCollectiblesSection = () => (
  <CollectiblesSection sectionIndex={0} totalSectionsLoaded={1} />
);

/** Exercises the homepage entry points through the actual Collectibles stack. */
export const renderCollectiblesSectionWithRoutes = (
  overrides?: DeepPartial<RootState>,
) => {
  const state = initialStateCollectibles();
  if (overrides) {
    state.withOverrides(overrides);
  }
  return renderScreenWithRoutes(
    HomepageCollectiblesSection,
    { name: Routes.WALLET_VIEW },
    [{ name: Routes.COLLECTIBLES.ROOT, Component: CollectiblesScreenStack }],
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
  store: ReturnType<typeof renderCollectiblesSectionWithRoutes>['store'],
) => {
  const engineWithState = Engine as { state?: Partial<typeof Engine.state> };
  const previousEngineState = engineWithState.state;

  const setEnabled = (enabled: boolean) => {
    const flagState: typeof Engine.state.RemoteFeatureFlagController =
      store.getState().engine.backgroundState.RemoteFeatureFlagController;
    engineWithState.state = {
      ...engineWithState.state,
      RemoteFeatureFlagController: {
        ...flagState,
        remoteFeatureFlags: {
          ...flagState.remoteFeatureFlags,
          collectiblesEnabled: { enabled, minimumVersion: '0.0.1' },
        },
      },
    };
    store.dispatch(updateBgState({ key: 'RemoteFeatureFlagController' }));
  };

  const cleanup = () => {
    engineWithState.state = previousEngineState;
  };

  return { setEnabled, cleanup };
};
