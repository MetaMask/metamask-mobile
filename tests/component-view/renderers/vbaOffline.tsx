import '../mocks';
import React, { useEffect, useState } from 'react';
import { act } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../app/__mocks__/@react-native-community/netinfo';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import ReduxService, { type ReduxStore } from '../../../app/core/redux';
import Routes from '../../../app/constants/navigation/Routes';
import MoneyHomeView from '../../../app/components/UI/Money/Views/MoneyHomeView/MoneyHomeView';
import VbaDetails from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/VbaDetails';
import VbaOnboardingNavigator from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/VbaOnboardingNavigator';
import type { VbaSourceCurrency } from '../../../app/util/region/getVbaSourceCurrency';
import { renderScreenWithRoutes } from '../render';
import { initialStateVba } from '../presets/vba';

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

type MockNetInfoState = Parameters<typeof netInfoMock.__setMockNetInfo>[0];

/** NetInfo reading for no connectivity (network tier `NONE`). */
export const VBA_OFFLINE_NET_INFO: MockNetInfoState = {
  type: 'none',
  isInternetReachable: false,
};

/** NetInfo reading for a working Wi-Fi connection (network tier `WIFI`). */
export const VBA_ONLINE_NET_INFO: MockNetInfoState = {
  type: 'wifi',
  isInternetReachable: true,
};

let notifyNetInfoChange: (() => void) | undefined;

/**
 * The NetInfo mock is a plain getter with no subscription, so a connectivity
 * change never re-renders the screen on its own. This host re-renders the
 * screen when {@link setVbaNetInfo} runs, as the real `useNetInfo`
 * subscription does.
 */
const withNetInfoSubscription = (
  Screen: React.ComponentType,
): React.ComponentType => {
  const NetInfoSubscribedScreen = () => {
    const [, setRevision] = useState(0);
    useEffect(() => {
      notifyNetInfoChange = () => setRevision((revision) => revision + 1);
      return () => {
        notifyNetInfoChange = undefined;
      };
    }, []);
    return <Screen />;
  };
  return NetInfoSubscribedScreen;
};

/**
 * Sets what `useNetInfo` returns and re-renders the subscribed screen.
 *
 * @param state - The NetInfo reading to switch to.
 */
export const setVbaNetInfo = async (state: MockNetInfoState) => {
  netInfoMock.__setMockNetInfo(state);
  await act(async () => {
    notifyNetInfoChange?.();
  });
};

let restoreStore: (() => void) | undefined;

/**
 * Puts back the `ReduxService.store` that was current before the last offline
 * renderer call. Call from `afterEach`.
 */
export function restoreVbaOfflineReduxServiceStore(): void {
  restoreStore?.();
}

const bindReduxServiceStore = (store: ReduxStore) => {
  restoreVbaOfflineReduxServiceStore();
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

interface RenderVbaOfflineOptions {
  location?: string;
  overrides?: DeepPartial<RootState>;
}

const buildState = ({ location, overrides }: RenderVbaOfflineOptions) => {
  const builder = initialStateVba({ location });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  return builder.build();
};

/**
 * Standalone bank details screen (`Routes.RAMP.VBA_DETAILS`) whose network
 * tier can be switched with {@link setVbaNetInfo}.
 */
export const renderVbaDetailsWithNetInfo = ({
  sourceCurrency,
  ...options
}: RenderVbaOfflineOptions & { sourceCurrency?: VbaSourceCurrency } = {}) => {
  const result = renderScreenWithRoutes(
    withNetInfoSubscription(VbaDetails as unknown as React.ComponentType),
    { name: Routes.RAMP.VBA_DETAILS },
    [{ name: Routes.RAMP.VBA_ONBOARDING }, { name: Routes.WALLET.HOME }],
    { state: buildState(options) },
    sourceCurrency ? { sourceCurrency } : undefined,
  );
  bindReduxServiceStore(result.store as unknown as ReduxStore);
  return result;
};

/**
 * Money home with the real VBA onboarding navigator behind the home card, so
 * a card CTA runs the real loading screen and lands on the real next screen.
 * The network tier can be switched with {@link setVbaNetInfo}.
 */
export const renderVbaMoneyHomeWithOnboarding = (
  options: RenderVbaOfflineOptions = {},
) => {
  const result = renderScreenWithRoutes(
    withNetInfoSubscription(MoneyHomeView as unknown as React.ComponentType),
    { name: Routes.MONEY.HOME },
    [
      {
        name: Routes.RAMP.VBA_ONBOARDING,
        Component:
          VbaOnboardingNavigator as unknown as React.ComponentType<object>,
      },
      { name: Routes.RAMP.VBA_DETAILS },
    ],
    { state: buildState(options) },
  );
  bindReduxServiceStore(result.store as unknown as ReduxStore);
  return result;
};
