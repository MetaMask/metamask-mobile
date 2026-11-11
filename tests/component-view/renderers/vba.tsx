import '../mocks';
import React from 'react';
import { Pressable, Text } from 'react-native';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import type { AppNavigationProp } from '../../../app/core/NavigationService/types';
import ReduxService, { type ReduxStore } from '../../../app/core/redux';
import Routes from '../../../app/constants/navigation/Routes';
import MoneyAddMoneySheet from '../../../app/components/UI/Money/components/MoneyAddMoneySheet/MoneyAddMoneySheet';
import VbaOnboardingNavigator from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/VbaOnboardingNavigator';
import VbaDetails from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/VbaDetails';
import VbaVendorTermsAdapter from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/modules/VbaVendorTermsAdapter';
import VbaOnboardingLoading from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/VbaOnboardingLoading';
import { VbaOnboardingRoutes } from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/routes';
import { useVbaHomeCard } from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/hooks/useVbaHomeCard';
import { useVbaEligibility } from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/hooks/useVbaEligibility';
import MoneyVbaHomeCard from '../../../app/components/UI/Money/components/MoneyVbaHomeCard';
import { getMoneyHomeCard } from '../../../app/components/UI/Money/hooks/getMoneyHomeCard';
import { selectUsableVbaAutoramp } from '../../../app/selectors/rampsController';
import { createRouteParamsProbe, renderScreenWithRoutes } from '../render';
import { initialStateVba } from '../presets/vba';

export const VbaRendererTestIds = {
  OPEN_VENDOR_TERMS: 'vba-renderer-open-vendor-terms',
  OPEN_MONEY_SHEET: 'vba-renderer-open-money-sheet',
  CALLER: 'vba-renderer-caller',
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

const VBA_PROBED_ONBOARDING_ROUTES = Object.values(VbaOnboardingRoutes).filter(
  (name) => name !== VbaOnboardingRoutes.LOADING,
);

const ProbedOnboardingStack = createNativeStackNavigator();

const VbaProbedOnboardingNavigator = () => (
  <ProbedOnboardingStack.Navigator screenOptions={{ headerShown: false }}>
    <ProbedOnboardingStack.Screen
      name={VbaOnboardingRoutes.LOADING}
      component={VbaOnboardingLoading as unknown as React.ComponentType}
    />
    {VBA_PROBED_ONBOARDING_ROUTES.map((name) => (
      <ProbedOnboardingStack.Screen
        key={name}
        name={name}
        component={createRouteParamsProbe(name)}
      />
    ))}
  </ProbedOnboardingStack.Navigator>
);

const VbaHomeCardHost = () => {
  const vbaCard = useVbaHomeCard();
  const { isEligible, isLoading } = useVbaEligibility();
  const hasUsableAutoramp = Boolean(useSelector(selectUsableVbaAutoramp));
  const homeCard = getMoneyHomeCard({
    isEligibilityLoading: isLoading,
    isMoneyBalanceLoading: false,
    isCryptoBalanceLoading: false,
    isCardStateResolved: true,
    vbaCard,
    isVbaEligible: isEligible,
    hasCrypto: false,
    hasUsableAutoramp,
    isMoneyAccountFunded: false,
    isCardLinked: false,
    isResidencyBlocked: false,
    isCardStepSkipped: false,
    isKycDecisionDismissed: false,
  });

  return homeCard.type === 'vba' ? (
    <MoneyVbaHomeCard variant={homeCard.variant} />
  ) : null;
};

/**
 * Money home VBA card. Its CTA lands on an onboarding params probe or the
 * account details probe.
 */
export const renderVbaHomeCard = (options: RenderVbaOptions = {}) => {
  const result = renderScreenWithRoutes(
    VbaHomeCardHost,
    { name: Routes.MONEY.HOME },
    [
      {
        name: Routes.RAMP.VBA_ONBOARDING,
        Component: VbaProbedOnboardingNavigator,
      },
      { name: Routes.RAMP.VBA_DETAILS },
    ],
    { state: buildVbaState(options) },
  );
  bindVbaReduxServiceStore(result.store as unknown as ReduxStore);
  return result;
};

/**
 * Like {@link renderVbaMoneyEntry}, but the loading screen is real and every
 * other onboarding route is a params probe.
 */
export const renderVbaMoneyEntryWithDestinationProbes = (
  options: RenderVbaOptions = {},
) => {
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
        Component: VbaProbedOnboardingNavigator,
      },
      { name: Routes.RAMP.VBA_DETAILS },
    ],
    { state: buildVbaState(options) },
  );
  bindVbaReduxServiceStore(result.store as unknown as ReduxStore);
  return result;
};
