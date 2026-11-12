import '../mocks';
import React from 'react';
import type { RootState } from '../../../app/reducers';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import Routes from '../../../app/constants/navigation/Routes';
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
