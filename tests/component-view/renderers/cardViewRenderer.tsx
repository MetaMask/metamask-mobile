import '../mocks';
import React from 'react';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import { initialStateCard } from '../presets/cardStatePreset';
import CardHome from '../../../app/components/UI/Card/Views/CardHome/CardHome';
import {
  CardSDKProvider,
  type ICardSDK,
} from '../../../app/components/UI/Card/sdk';
import Routes from '../../../app/constants/navigation/Routes';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

interface RenderCardViewOptions {
  overrides?: DeepPartial<RootState>;
  initialParams?: Record<string, unknown>;
  extraRoutes?: { name: string; Component?: React.ComponentType<object> }[];
}

const defaultCardSdkContext: ICardSDK = {
  sdk: null,
  isLoading: false,
  user: null,
  setUser: () => undefined,
  logoutFromProvider: async () => undefined,
  fetchUserData: async () => undefined,
  isReturningSession: false,
};

function withCardSdkProvider<T extends object>(
  Component: React.ComponentType<T>,
): React.ComponentType<T> {
  return function WrappedWithCardSdkProvider(props: T) {
    return (
      <CardSDKProvider value={defaultCardSdkContext}>
        <Component {...props} />
      </CardSDKProvider>
    );
  };
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

  const CardHomeWithSdk = withCardSdkProvider(CardHome);

  if (extraRoutes?.length) {
    return renderScreenWithRoutes(
      CardHomeWithSdk,
      { name: Routes.CARD.HOME },
      extraRoutes.map(({ name, Component }) => ({
        name,
        Component: Component ? withCardSdkProvider(Component) : undefined,
      })),
      { state },
      initialParams,
    );
  }

  return renderComponentViewScreen(
    CardHomeWithSdk,
    { name: Routes.CARD.HOME },
    { state },
    initialParams,
  );
}
