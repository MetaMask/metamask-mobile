import '../mocks';
import type React from 'react';
import Routes from '../../../app/constants/navigation/Routes';
import GachaHome from '../../../app/components/UI/Gacha/views/GachaHome';
import type { RootState } from '../../../app/reducers';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import { renderScreenWithRoutes } from '../render';
import {
  initialStateGacha,
  type InitialStateGachaOptions,
} from '../presets/gacha';

interface RenderGachaViewOptions extends InitialStateGachaOptions {
  entry?: { Component: React.ComponentType; name: string };
  routes?: Parameters<typeof renderScreenWithRoutes>[2];
  params?: Record<string, unknown>;
  overrides?: DeepPartial<RootState>;
}

/** Renders Gacha with shared state and real navigation; destinations may be route probes. */
export const renderGachaView = ({
  entry = { Component: GachaHome, name: Routes.GACHA.HOME },
  routes = [],
  params,
  overrides,
  ...stateOptions
}: RenderGachaViewOptions = {}) => {
  const fixture = initialStateGacha(stateOptions);
  if (overrides) fixture.withOverrides(overrides);
  return renderScreenWithRoutes(
    entry.Component,
    { name: entry.name },
    routes,
    { state: fixture.build() },
    params,
  );
};
