import '../mocks';
import React from 'react';
import { Pressable, Text } from 'react-native';
import {
  createNavigationContainerRef,
  NavigationContainer,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import renderWithProvider, {
  type DeepPartial,
} from '../../../app/util/test/renderWithProvider';
import NavigationService from '../../../app/core/NavigationService';
import type { RootState } from '../../../app/reducers';
import type { AppNavigationProp } from '../../../app/core/NavigationService/types';
import ReduxService, { type ReduxStore } from '../../../app/core/redux';
import Routes from '../../../app/constants/navigation/Routes';
import MoneyAddMoneySheet from '../../../app/components/UI/Money/components/MoneyAddMoneySheet/MoneyAddMoneySheet';
import VbaOnboardingNavigator from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/VbaOnboardingNavigator';
import VbaDetails from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/VbaDetails';
import VbaVendorTermsAdapter from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/modules/VbaVendorTermsAdapter';
import { VbaOnboardingRoutes } from '../../../app/components/UI/Ramp/Views/VirtualBankAccount/routes';
import DeleteIdentityData from '../../../app/components/Views/Settings/SecuritySettings/Sections/DeleteIdentityData';
import { MfaFlowSelectorsIDs } from '../../../app/components/Views/Mfa/Mfa.testIds';
import MfaFlowHost from '../../../app/components/Views/Mfa/MfaFlowHost/MfaFlowHost';
import MfaFlowLauncher from '../../../app/components/Views/Mfa/MfaFlowHost/MfaFlowLauncher';
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
  /** Approved virtual bank account on the test money address. */
  hasActiveAccount?: boolean;
  /** Persisted UKYC session. The delete-identity section stays hidden without one. */
  hasKycSession?: boolean;
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
  hasActiveAccount,
  hasKycSession,
}: RenderVbaOptions) => {
  const builder = initialStateVba({
    location,
    flagEnabled,
    hasActiveAccount,
    hasKycSession,
  });
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

const DeleteIdentityStack = createNativeStackNavigator();

/** MFA controls the identity-deletion email check renders. */
export const VbaDeleteIdentityTestIds = {
  OTP_SCREEN: `${MfaFlowSelectorsIDs.CONTAINER}-otp`,
  CODE_INPUT: MfaFlowSelectorsIDs.CODE_INPUT,
  BACK_BUTTON: MfaFlowSelectorsIDs.BACK_BUTTON,
} as const;

/**
 * Security settings hosts the delete section. The MFA launcher opens the
 * email check through `NavigationService`, so this renderer owns the
 * container ref instead of the flat route helper.
 */
const VbaDeleteIdentityHost = (): React.ReactElement => (
  <>
    <DeleteIdentityData />
    <MfaFlowLauncher />
  </>
);

/**
 * Renders the identity-deletion section for a customer with an active virtual
 * bank account and a KYC session. Callers can turn either off.
 */
export const renderVbaDeleteIdentityData = (options: RenderVbaOptions = {}) => {
  const navigation = createNavigationContainerRef<ParamListBase>();
  NavigationService.navigation = navigation;
  const result = renderWithProvider(
    <NavigationContainer ref={navigation}>
      <DeleteIdentityStack.Navigator
        screenOptions={{ headerShown: false, animation: 'none' }}
      >
        <DeleteIdentityStack.Screen
          name={Routes.SETTINGS.SECURITY_SETTINGS}
          component={VbaDeleteIdentityHost}
        />
        <DeleteIdentityStack.Screen
          name={Routes.MFA.FLOW}
          component={MfaFlowHost}
        />
      </DeleteIdentityStack.Navigator>
    </NavigationContainer>,
    {
      state: buildVbaState({
        hasActiveAccount: true,
        hasKycSession: true,
        ...options,
      }),
    },
    false,
  );
  bindVbaReduxServiceStore(result.store as unknown as ReduxStore);
  return { ...result, navigation };
};
