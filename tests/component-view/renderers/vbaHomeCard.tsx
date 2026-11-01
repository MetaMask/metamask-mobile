import '../mocks';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import ReduxService, { type ReduxStore } from '../../../app/core/redux';
import Routes from '../../../app/constants/navigation/Routes';
import MoneyHomeView from '../../../app/components/UI/Money/Views/MoneyHomeView/MoneyHomeView';
import VbaOnboardingLoading from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/VbaOnboardingLoading';
import { VbaOnboardingRoutes } from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/routes';
import { createRouteParamsProbe, renderScreenWithRoutes } from '../render';
import { initialStateVba } from '../presets/vba';

/**
 * Onboarding routes a home-card CTA can resolve to. The loading screen is the
 * real one, so hydrate runs and the real router picks the destination; every
 * destination renders a params probe so tests can assert the route and params.
 */
const VBA_HOME_CARD_DESTINATIONS = Object.values(VbaOnboardingRoutes).filter(
  (name) => name !== VbaOnboardingRoutes.LOADING,
);

const OnboardingStack = createNativeStackNavigator();

const VbaHomeCardOnboardingNavigator = () => (
  <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
    <OnboardingStack.Screen
      name={VbaOnboardingRoutes.LOADING}
      component={VbaOnboardingLoading as unknown as React.ComponentType}
    />
    {VBA_HOME_CARD_DESTINATIONS.map((name) => (
      <OnboardingStack.Screen
        key={name}
        name={name}
        component={createRouteParamsProbe(name)}
      />
    ))}
  </OnboardingStack.Navigator>
);

let restoreStore: (() => void) | undefined;

/**
 * Puts back the `ReduxService.store` that was current before the last
 * {@link renderVbaHomeCardMoneyHome} call. Call from `afterEach`.
 */
export function restoreVbaHomeCardReduxServiceStore(): void {
  restoreStore?.();
}

const bindReduxServiceStore = (store: ReduxStore) => {
  restoreVbaHomeCardReduxServiceStore();
  let previousStore: ReduxStore | undefined;
  try {
    previousStore = ReduxService.store;
  } catch {
    previousStore = undefined;
  }
  ReduxService.store = store;
  restoreStore = () => {
    restoreStore = undefined;
    if (previousStore) {
      ReduxService.store = previousStore;
    }
  };
};

interface RenderVbaHomeCardOptions {
  location?: string;
  flagEnabled?: boolean;
  overrides?: DeepPartial<RootState>;
}

/**
 * Money home with the VBA preset. A home-card CTA opens the real onboarding
 * loading screen, which hydrates and routes to a params probe.
 */
export const renderVbaHomeCardMoneyHome = ({
  location,
  flagEnabled,
  overrides,
}: RenderVbaHomeCardOptions = {}) => {
  const builder = initialStateVba({ location, flagEnabled });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const result = renderScreenWithRoutes(
    MoneyHomeView as unknown as React.ComponentType,
    { name: Routes.MONEY.HOME },
    [
      {
        name: Routes.RAMP.VBA_ONBOARDING,
        Component: VbaHomeCardOnboardingNavigator,
      },
      { name: Routes.RAMP.VBA_DETAILS },
    ],
    { state: builder.build() },
  );
  bindReduxServiceStore(result.store as unknown as ReduxStore);
  return result;
};
