import '../mocks';
import React from 'react';
import type { RootState } from '../../../app/reducers';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import Routes from '../../../app/constants/navigation/Routes';
import GachaHome from '../../../app/components/UI/Gacha/views/GachaHome';
import GachaScreenStack from '../../../app/components/UI/Gacha/routes';
import type { GachaHomeParams } from '../../../app/components/UI/Gacha/types/navigation';
import GachaSection from '../../../app/components/Views/Homepage/Sections/Gacha';
import { initialStateGacha } from '../presets/gacha';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';

/** Renders the empty tabs with real navigation and Redux. */
export const renderGachaView = (params?: GachaHomeParams) =>
  renderComponentViewScreen(
    GachaHome,
    { name: Routes.GACHA.HOME },
    { state: initialStateGacha().build() },
    params ? { ...params } : undefined,
  );

const HomepageGachaSection = () => (
  <GachaSection sectionIndex={0} totalSectionsLoaded={1} />
);

/** Exercises the homepage entry points through the actual Gacha stack. */
export const renderGachaSectionWithRoutes = (
  overrides?: DeepPartial<RootState>,
) => {
  const state = initialStateGacha();
  if (overrides) {
    state.withOverrides(overrides);
  }
  return renderScreenWithRoutes(
    HomepageGachaSection,
    { name: Routes.WALLET_VIEW },
    [{ name: Routes.GACHA.ROOT, Component: GachaScreenStack }],
    { state: state.build() },
  );
};
