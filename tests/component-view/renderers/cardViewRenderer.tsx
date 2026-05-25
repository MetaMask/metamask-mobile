import '../mocks';
import React from 'react';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import { initialStateCard } from '../presets/cardStatePreset';
import CardHome from '../../../app/components/UI/Card/Views/CardHome/CardHome';
import Routes from '../../../app/constants/navigation/Routes';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

interface RenderCardViewOptions {
  overrides?: DeepPartial<RootState>;
  initialParams?: Record<string, unknown>;
  extraRoutes?: { name: string; Component?: React.ComponentType<object> }[];
}

/**
 * Render CardHome inside a minimal navigation stack with real Redux state.
 *
 * Pass `extraRoutes` to register probe screens for navigation assertions.
 * Pass `overrides` to adjust specific Redux state fields.
 */
export function renderCardHomeView(options: RenderCardViewOptions = {}) {
  const { overrides, initialParams, extraRoutes } = options;

  const builder = initialStateCard();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  if (extraRoutes?.length) {
    return renderScreenWithRoutes(
      CardHome,
      { name: Routes.CARD.HOME },
      extraRoutes,
      { state },
      initialParams,
    );
  }

  return renderComponentViewScreen(
    CardHome,
    { name: Routes.CARD.HOME },
    { state },
    initialParams,
  );
}
