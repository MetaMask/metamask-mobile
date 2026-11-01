import '../mocks';
import React, { useEffect, useRef } from 'react';
import { Pressable, Text } from 'react-native';
import { useStore } from 'react-redux';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import type { AppNavigationProp } from '../../../app/core/NavigationService/types';
import ReduxService, { type ReduxStore } from '../../../app/core/redux';
import Routes from '../../../app/constants/navigation/Routes';
import VbaEmailAdapter from '../../../app/components/UI/KYC/Views/EmailAdapter';
import VbaIdentityVerificationModule from '../../../app/components/UI/KYC/Views/SumSub/IdentityVerification';
import MoneyAddMoneySheet from '../../../app/components/UI/Money/components/MoneyAddMoneySheet/MoneyAddMoneySheet';
import MoneyActivityView from '../../../app/components/UI/Money/Views/MoneyActivityView/MoneyActivityView';
import { MoneyApiActivityDetailsView } from '../../../app/components/UI/Money/Views/MoneyApiActivityDetailsView/MoneyApiActivityDetailsView';
import MoneyHomeView from '../../../app/components/UI/Money/Views/MoneyHomeView/MoneyHomeView';
import MfaFlowHost from '../../../app/components/Views/Mfa/MfaFlowHost/MfaFlowHost';
import { useActiveMfaFlow } from '../../../app/util/identity/mfa/engine/useActiveMfaFlow';
import SupportConsentSheet from '../../../app/components/UI/SupportConsentSheet';
import VbaOnboardingNavigator from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/VbaOnboardingNavigator';
import VbaDetails from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/VbaDetails';
import VbaVendorTermsAdapter from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/modules/VbaVendorTermsAdapter';
import { VbaKycRejectedAdapter } from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/modules/VbaStatusAdapters';
import { VbaOnboardingRoutes } from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/routes';
import type { VbaOnboardingSnapshot } from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
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

const SupportModalStack = createNativeStackNavigator();

const VbaSupportConsentModal = () => (
  <SupportModalStack.Navigator screenOptions={{ headerShown: false }}>
    <SupportModalStack.Screen
      name={Routes.MODAL.SUPPORT_CONSENT_SHEET}
      component={SupportConsentSheet}
    />
  </SupportModalStack.Navigator>
);

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

export const renderVbaKycRejected = (options: RenderVbaOptions = {}) => {
  const result = renderScreenWithRoutes(
    VbaKycRejectedAdapter as unknown as React.ComponentType,
    { name: VbaOnboardingRoutes.KYC_REJECTED },
    [
      {
        name: VbaOnboardingRoutes.IDENTITY_VERIFICATION,
        Component: createRouteParamsProbe(
          VbaOnboardingRoutes.IDENTITY_VERIFICATION,
        ),
      },
      { name: VbaOnboardingRoutes.ERROR },
      {
        name: Routes.MODAL.ROOT_MODAL_FLOW,
        Component: VbaSupportConsentModal,
      },
    ],
    { state: buildVbaState(options) },
  );
  bindVbaReduxServiceStore(result.store as unknown as ReduxStore);
  return result;
};

/**
 * Mounts the real onboarding navigator on Identity verification, so the
 * SumSub launch, KYC pending, and every destination after it are real screens.
 */
export const renderVbaIdentityVerification = (
  snapshot: VbaOnboardingSnapshot,
  options: RenderVbaOptions = {},
) => {
  const result = renderScreenWithRoutes(
    VbaOnboardingNavigator as unknown as React.ComponentType,
    { name: Routes.RAMP.VBA_ONBOARDING },
    [
      { name: Routes.HOME_TABS },
      { name: Routes.RAMP.VBA_DETAILS },
      {
        name: Routes.MODAL.ROOT_MODAL_FLOW,
        Component: VbaSupportConsentModal,
      },
    ],
    { state: buildVbaState(options) },
    { screen: VbaOnboardingRoutes.IDENTITY_VERIFICATION, params: { snapshot } },
  );
  bindVbaReduxServiceStore(result.store as unknown as ReduxStore);
  return result;
};

export const renderVbaDetails = (options: RenderVbaOptions = {}) => {
  const result = renderScreenWithRoutes(
    VbaDetails as unknown as React.ComponentType,
    { name: Routes.RAMP.VBA_DETAILS },
    [
      {
        name: Routes.RAMP.VBA_ONBOARDING,
        Component:
          VbaOnboardingNavigator as unknown as React.ComponentType<object>,
      },
      { name: Routes.HOME_TABS },
      {
        name: Routes.MODAL.ROOT_MODAL_FLOW,
        Component: VbaSupportConsentModal,
      },
    ],
    { state: buildVbaState(options) },
  );
  bindVbaReduxServiceStore(result.store as unknown as ReduxStore);
  return result;
};

export const renderVbaMoneyHome = (options: RenderVbaOptions = {}) => {
  const result = renderScreenWithRoutes(
    MoneyHomeView as unknown as React.ComponentType,
    { name: Routes.MONEY.HOME },
    [
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

const VbaEmailVerificationHost = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const active = useActiveMfaFlow();
  const hasScreen = active !== undefined && active.state.step.name !== 'idle';

  useEffect(() => {
    if (!hasScreen) {
      return;
    }
    const isOpen = navigation
      .getState()
      ?.routes.some((route) => route.name === Routes.MFA.FLOW);
    if (!isOpen) {
      navigation.navigate(Routes.MFA.FLOW);
    }
  }, [hasScreen, navigation]);

  return <VbaEmailAdapter />;
};

export const renderVbaMoneyActivityHistory = (
  options: RenderVbaOptions = {},
) => {
  const result = renderScreenWithRoutes(
    MoneyActivityView as unknown as React.ComponentType,
    { name: Routes.MONEY.ACTIVITY },
    [
      {
        name: Routes.MONEY.CARD_TRANSACTION_DETAILS,
        Component:
          MoneyApiActivityDetailsView as unknown as React.ComponentType,
      },
    ],
    { state: buildVbaState(options) },
  );
  bindVbaReduxServiceStore(result.store as unknown as ReduxStore);
  return result;
};

/**
 * Email step on a stack that also registers the onboarding routes, so a
 * finished email code can reset onto identity verification.
 */
export const renderVbaEmailSessionCreation = (
  options: RenderVbaOptions = {},
) => {
  const result = renderScreenWithRoutes(
    VbaEmailVerificationHost,
    { name: VbaOnboardingRoutes.EMAIL },
    [
      {
        name: Routes.MFA.FLOW,
        Component: MfaFlowHost as unknown as React.ComponentType,
      },
      { name: VbaOnboardingRoutes.VENDOR_TERMS },
      {
        name: VbaOnboardingRoutes.IDENTITY_VERIFICATION,
        Component:
          VbaIdentityVerificationModule as unknown as React.ComponentType,
      },
      { name: Routes.HOME_TABS },
    ],
    { state: buildVbaState(options) },
  );
  bindVbaReduxServiceStore(result.store as unknown as ReduxStore);
  return result;
};

/**
 * Binds `ReduxService.store` during render, before the loading screen's effect
 * reads it. `renderScreenWithRoutes` has already flushed effects by the time
 * it returns, so binding afterwards is too late.
 */
const VbaOnboardingLoadingScreen = () => {
  const store = useStore();
  const isBound = useRef(false);
  if (!isBound.current) {
    bindVbaReduxServiceStore(store as unknown as ReduxStore);
    isBound.current = true;
  }

  return <VbaOnboardingNavigator />;
};

/** Cold entry: the real onboarding navigator opens on the loading screen. */
export const renderVbaOnboardingLoading = (options: RenderVbaOptions = {}) =>
  renderScreenWithRoutes(
    VbaOnboardingLoadingScreen,
    { name: Routes.RAMP.VBA_ONBOARDING },
    [{ name: Routes.HOME_TABS }, { name: Routes.RAMP.VBA_DETAILS }],
    { state: buildVbaState(options) },
    { screen: VbaOnboardingRoutes.LOADING },
  );

export const renderVbaEmailVerification = (options: RenderVbaOptions = {}) => {
  const result = renderScreenWithRoutes(
    VbaEmailVerificationHost,
    { name: VbaOnboardingRoutes.EMAIL },
    [
      {
        name: Routes.MFA.FLOW,
        Component: MfaFlowHost as unknown as React.ComponentType,
      },
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
