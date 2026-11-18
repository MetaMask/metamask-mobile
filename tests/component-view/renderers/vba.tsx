import '../mocks';
import React from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { Pressable, Text } from 'react-native';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import type { AppNavigationProp } from '../../../app/core/NavigationService/types';
import ReduxService, { type ReduxStore } from '../../../app/core/redux';
import Routes from '../../../app/constants/navigation/Routes';
import MoneyAddMoneySheet from '../../../app/components/UI/Money/components/MoneyAddMoneySheet/MoneyAddMoneySheet';
import VbaOnboardingNavigator from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/VbaOnboardingNavigator';
import VbaDetails from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/VbaDetails';
import VbaVendorTermsAdapter from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/modules/VbaVendorTermsAdapter';
import { VbaOnboardingRoutes } from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/routes';
import { renderScreenWithRoutes } from '../render';
import { initialStateVba } from '../presets/vba';

export const VbaRendererTestIds = {
  OPEN_VENDOR_TERMS: 'vba-renderer-open-vendor-terms',
  OPEN_MONEY_SHEET: 'vba-renderer-open-money-sheet',
  CALLER: 'vba-renderer-caller',
  WALLET_HOME: 'vba-renderer-wallet-home',
  OPEN_CARD_HOME: 'vba-renderer-open-card-home',
  CARD_HOME_BACK: 'vba-renderer-card-home-back',
} as const;

let restoreVbaReduxStore: (() => void) | undefined;

/**
 * Puts back the `ReduxService.store` that was current before the last VBA
 * renderer call. Call from `afterEach` so later suites on the same Jest worker
 * do not read this test's store.
 */
export function restoreVbaReduxServiceStore(): void {
  restoreVbaReduxStore?.();
}

const bindVbaReduxServiceStore = (store: ReduxStore) => {
  restoreVbaReduxServiceStore();
  let previousStore: ReduxStore | undefined;
  try {
    previousStore = ReduxService.store;
  } catch {
    previousStore = undefined;
  }
  ReduxService.store = store;
  restoreVbaReduxStore = () => {
    restoreVbaReduxStore = undefined;
    if (previousStore) {
      ReduxService.store = previousStore;
    }
  };
};

interface RenderVbaOptions {
  location?: string;
  flagEnabled?: boolean;
  overrides?: DeepPartial<RootState>;
  /** A caller-owned query client, for tests that seed the cache first. */
  queryClient?: QueryClient;
}

const VbaTermsCaller = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return (
    <>
      <Text testID={VbaRendererTestIds.CALLER}>VBA caller</Text>
      <Pressable
        testID={VbaRendererTestIds.OPEN_VENDOR_TERMS}
        onPress={() => navigation.navigate(VbaOnboardingRoutes.VENDOR_TERMS)}
      >
        <Text>Open vendor terms</Text>
      </Pressable>
    </>
  );
};

const VbaMoneyCaller = () => {
  const navigation = useNavigation<AppNavigationProp>();

  return (
    <Pressable
      testID={VbaRendererTestIds.OPEN_MONEY_SHEET}
      onPress={() => navigation.navigate(Routes.MONEY.MODALS.ADD_MONEY_SHEET)}
    >
      <Text>Open add money</Text>
    </Pressable>
  );
};

/**
 * Wallet home under a Card home stand-in. Card home's back only fails when
 * something sits beneath it: opening a bank account used to drop that screen.
 */
const VbaWalletHomeCaller = (): React.ReactElement => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return (
    <>
      <Text testID={VbaRendererTestIds.WALLET_HOME}>Wallet home</Text>
      <Pressable
        testID={VbaRendererTestIds.OPEN_CARD_HOME}
        onPress={() => navigation.navigate('VbaCardHomeCaller')}
      >
        <Text>Open card home</Text>
      </Pressable>
    </>
  );
};

/**
 * Stand-in for Card home: the real Add money sheet, plus the header back
 * (`navigation.goBack()` from `useCardHeaderHandlers('back')`).
 */
const VbaCardHomeCaller = (): React.ReactElement => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return (
    <>
      <Pressable
        testID={VbaRendererTestIds.OPEN_MONEY_SHEET}
        onPress={() => navigation.navigate(Routes.MONEY.MODALS.ADD_MONEY_SHEET)}
      >
        <Text>Open add money</Text>
      </Pressable>
      <Pressable
        testID={VbaRendererTestIds.CARD_HOME_BACK}
        onPress={() => navigation.goBack()}
      >
        <Text>Back</Text>
      </Pressable>
    </>
  );
};

const buildVbaState = ({
  location,
  flagEnabled,
  overrides,
}: RenderVbaOptions) => {
  const builder = initialStateVba({ location, flagEnabled });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  return builder.build();
};

export const renderVbaVendorTerms = (options: RenderVbaOptions = {}) => {
  const result = renderScreenWithRoutes(
    VbaVendorTermsAdapter as unknown as React.ComponentType,
    { name: VbaOnboardingRoutes.VENDOR_TERMS },
    [{ name: VbaOnboardingRoutes.EMAIL }, { name: VbaOnboardingRoutes.ERROR }],
    { state: buildVbaState(options) },
    undefined,
    options.queryClient,
  );
  bindVbaReduxServiceStore(result.store as unknown as ReduxStore);
  return result;
};

export const renderVbaVendorTermsWithCaller = (
  options: RenderVbaOptions = {},
) => {
  const result = renderScreenWithRoutes(
    VbaTermsCaller,
    { name: 'VbaTermsCaller' },
    [
      {
        name: VbaOnboardingRoutes.VENDOR_TERMS,
        Component: VbaVendorTermsAdapter as unknown as React.ComponentType,
      },
      { name: VbaOnboardingRoutes.EMAIL },
      { name: VbaOnboardingRoutes.ERROR },
    ],
    { state: buildVbaState(options) },
  );
  bindVbaReduxServiceStore(result.store as unknown as ReduxStore);
  return result;
};

export const renderVbaMoneyEntry = (options: RenderVbaOptions = {}) => {
  const result = renderScreenWithRoutes(
    VbaMoneyCaller,
    { name: 'VbaMoneyCaller' },
    [
      {
        name: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
        Component: MoneyAddMoneySheet as unknown as React.ComponentType,
      },
      {
        name: Routes.RAMP.VBA_ONBOARDING,
        Component:
          VbaOnboardingNavigator as unknown as React.ComponentType<object>,
      },
      {
        name: Routes.RAMP.VBA_DETAILS,
        Component: VbaDetails as unknown as React.ComponentType,
      },
    ],
    { state: buildVbaState(options) },
  );
  bindVbaReduxServiceStore(result.store as unknown as ReduxStore);
  return result;
};

/**
 * Card home opened on top of wallet home, then the real Add money sheet and
 * bank screens. Back from the bank screen returns to Card home, and Card
 * home's back returns to wallet home.
 */
export const renderVbaCardHomeEntry = (
  options: RenderVbaOptions = {},
): ReturnType<typeof renderScreenWithRoutes> => {
  const result = renderScreenWithRoutes(
    VbaWalletHomeCaller,
    { name: 'VbaWalletHomeCaller' },
    [
      {
        name: 'VbaCardHomeCaller',
        Component: VbaCardHomeCaller,
      },
      {
        name: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
        Component: MoneyAddMoneySheet as unknown as React.ComponentType,
      },
      {
        name: Routes.RAMP.VBA_ONBOARDING,
        Component:
          VbaOnboardingNavigator as unknown as React.ComponentType<object>,
      },
      {
        name: Routes.RAMP.VBA_DETAILS,
        Component: VbaDetails as unknown as React.ComponentType,
      },
    ],
    { state: buildVbaState(options) },
  );
  bindVbaReduxServiceStore(result.store as unknown as ReduxStore);
  return result;
};
