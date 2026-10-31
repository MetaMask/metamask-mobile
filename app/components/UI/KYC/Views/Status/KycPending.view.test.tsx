import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommonActions, useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import ReduxService, { type ReduxStore } from '../../../../../core/redux';
import renderWithProvider, {
  type DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import { initialStateVba } from '../../../../../../tests/component-view/presets/vba';
import {
  VbaIdentityVerifiedAdapter,
  VbaKycPendingAdapter,
} from '../../../Ramp/Views/VirtualBankAccount/modules/VbaStatusAdapters';
import { VbaOnboardingRoutes } from '../../../Ramp/Views/VirtualBankAccount/routes';
import { resetMusdAutorampSetupGuard } from '../../../Ramp/Views/VirtualBankAccount/ensureMusdAutoramp';
import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  type VbaOnboardingSnapshot,
} from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import { VbaKycPendingSelectorsIDs } from './KycPending';
import { VbaIdentityVerifiedSelectorsIDs } from './IdentityVerified';

const VbaKycPendingViewSelectorsIDs = {
  OPEN_PENDING: 'vba-kyc-pending-open-from-previous-screen',
} as const;

// The redirect resumes the KYC session, hydrates, runs the funnel, and resets
// the stack, so allow more than the 1 s default.
const REDIRECT_TIMEOUT_MS = 5000;

const OnboardingStack = createNativeStackNavigator();
const RampStack = createNativeStackNavigator();
const LeaveStack = createNativeStackNavigator();
const MoneyRootStack = createNativeStackNavigator();
const MoneyHomeStack = createNativeStackNavigator();

const RouteProbe =
  (routeName: string): React.FC =>
  () => <Text testID={getRouteProbeTestId(routeName)}>{routeName}</Text>;

const vendorTermsProbe = RouteProbe(VbaOnboardingRoutes.VENDOR_TERMS);
const rejectedProbe = RouteProbe(VbaOnboardingRoutes.KYC_REJECTED);
const identityProbe = RouteProbe(VbaOnboardingRoutes.IDENTITY_VERIFICATION);
const provisioningProbe = RouteProbe(
  VbaOnboardingRoutes.ACCOUNT_PROVISIONING_ERROR,
);
const detailsProbe = RouteProbe(Routes.RAMP.VBA_DETAILS);
const moneyHomeProbe = RouteProbe(Routes.MONEY.HOME);

const PreviousScreen = () => {
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      testID={VbaKycPendingViewSelectorsIDs.OPEN_PENDING}
      onPress={() =>
        navigation.dispatch(
          CommonActions.navigate(VbaOnboardingRoutes.KYC_PENDING),
        )
      }
    >
      <Text>Previous screen</Text>
    </Pressable>
  );
};

const OnboardingNavigator = () => (
  <OnboardingStack.Navigator
    initialRouteName={VbaOnboardingRoutes.KYC_PENDING}
    screenOptions={{ headerShown: false }}
  >
    <OnboardingStack.Screen
      name={VbaOnboardingRoutes.VENDOR_TERMS}
      component={vendorTermsProbe}
    />
    <OnboardingStack.Screen
      name={VbaOnboardingRoutes.KYC_PENDING}
      component={VbaKycPendingAdapter}
    />
    <OnboardingStack.Screen
      name={VbaOnboardingRoutes.IDENTITY_VERIFIED}
      component={VbaIdentityVerifiedAdapter}
    />
    <OnboardingStack.Screen
      name={VbaOnboardingRoutes.KYC_REJECTED}
      component={rejectedProbe}
    />
    <OnboardingStack.Screen
      name={VbaOnboardingRoutes.IDENTITY_VERIFICATION}
      component={identityProbe}
    />
    <OnboardingStack.Screen
      name={VbaOnboardingRoutes.ACCOUNT_PROVISIONING_ERROR}
      component={provisioningProbe}
    />
  </OnboardingStack.Navigator>
);

const MoneyHomeNavigator = () => (
  <MoneyHomeStack.Navigator screenOptions={{ headerShown: false }}>
    <MoneyHomeStack.Screen
      name={Routes.MONEY.HOME}
      component={moneyHomeProbe}
    />
  </MoneyHomeStack.Navigator>
);

const MoneyRootNavigator = () => (
  <MoneyRootStack.Navigator screenOptions={{ headerShown: false }}>
    <MoneyRootStack.Screen
      name={Routes.MONEY.ROOT}
      component={MoneyHomeNavigator}
    />
  </MoneyRootStack.Navigator>
);

const RampNavigator = () => (
  <RampStack.Navigator
    initialRouteName={Routes.RAMP.VBA_ONBOARDING}
    screenOptions={{ headerShown: false }}
  >
    <RampStack.Screen name={Routes.HOME_TABS} component={MoneyRootNavigator} />
    <RampStack.Screen
      name={Routes.RAMP.VBA_ONBOARDING}
      component={OnboardingNavigator}
    />
    <RampStack.Screen name={Routes.RAMP.VBA_DETAILS} component={detailsProbe} />
  </RampStack.Navigator>
);

const PendingWithHistory = () => (
  <LeaveStack.Navigator
    initialRouteName="VbaPreviousScreen"
    screenOptions={{ headerShown: false }}
  >
    <LeaveStack.Screen name="VbaPreviousScreen" component={PreviousScreen} />
    <LeaveStack.Screen
      name={VbaOnboardingRoutes.KYC_PENDING}
      component={VbaKycPendingAdapter}
    />
  </LeaveStack.Navigator>
);

const PendingAtRoot = () => (
  <LeaveStack.Navigator
    initialRouteName={VbaOnboardingRoutes.KYC_PENDING}
    screenOptions={{ headerShown: false }}
  >
    <LeaveStack.Screen
      name={VbaOnboardingRoutes.KYC_PENDING}
      component={VbaKycPendingAdapter}
    />
    <LeaveStack.Screen name={Routes.HOME_TABS} component={MoneyRootNavigator} />
  </LeaveStack.Navigator>
);

interface KycSession {
  finalStatus: string;
  kycStatus: string;
}

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const engineContext = Engine.context as unknown as {
  RampsController: {
    hydrateVbaOnboarding?: jest.Mock;
    registerMoneyAccountWallet?: jest.Mock;
    createAutoramp?: jest.Mock;
  };
  KycController?: {
    state: { email: string | null };
    readSessionStatus: jest.Mock;
    startSession: jest.Mock;
    refreshSessionStatus: jest.Mock;
    recordVendorDisclaimers: jest.Mock;
  };
};

const hydratedSnapshot = (
  kycStatus: VbaOnboardingSnapshot['kycStatus'],
  autorampStatus: VbaOnboardingSnapshot['autorampStatus'] = 'not_ready',
): VbaOnboardingSnapshot => ({
  ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'submitted',
  kycStatus,
  autorampStatus,
});

const buildKycState = (session: KycSession) =>
  initialStateVba()
    .withOverrides({
      engine: {
        backgroundState: {
          KycController: {
            sessionStatus: {
              id: 'session-1',
              externalUserId: 'user-1',
              vendor: 'sumsub',
              vendorStatus: 'pending',
              finalStatus: session.finalStatus,
              kycStatus: session.kycStatus,
            },
            providerFlowStatus: 'submitted',
          },
        },
      },
    } as unknown as DeepPartial<RootState>)
    .build();

const renderKycScreen = (ui: React.ReactElement, session: KycSession) => {
  const state = buildKycState(session);
  ReduxService.store = {
    getState: () => state,
    dispatch: jest.fn(),
  } as unknown as ReduxStore;

  return renderWithProvider(ui, {
    state: state as DeepPartial<RootState>,
  });
};

describeForPlatforms('VbaKycPending', () => {
  let previousStore: ReduxStore | undefined;
  let hadStore = false;
  let storeReady = false;
  let previousKycController: typeof engineContext.KycController;
  let previousHydrate: jest.Mock | undefined;

  beforeEach(() => {
    if (storeReady) {
      previousStore = ReduxService.store;
      hadStore = true;
    } else {
      hadStore = false;
    }
    previousKycController = engineContext.KycController;
    previousHydrate = engineContext.RampsController.hydrateVbaOnboarding;
    resetMusdAutorampSetupGuard();
    engineContext.RampsController.registerMoneyAccountWallet = jest.fn();
    engineContext.RampsController.createAutoramp = jest.fn();
    engineContext.KycController = {
      state: { email: 'user@example.com' },
      readSessionStatus: jest.fn().mockReturnValue({ id: 'session-1' }),
      startSession: jest.fn().mockResolvedValue(undefined),
      refreshSessionStatus: jest.fn(),
      recordVendorDisclaimers: jest.fn().mockResolvedValue([]),
    };
  });

  afterEach(() => {
    netInfoMock.__resetMockNetInfo();
    engineContext.KycController = previousKycController;
    engineContext.RampsController.hydrateVbaOnboarding = previousHydrate;
    if (hadStore && previousStore) {
      ReduxService.store = previousStore;
    }
    storeReady = true;
  });

  it('returns to the previous screen from Come back later', async () => {
    const { getByTestId, getByText, queryByLabelText } = renderKycScreen(
      <PendingWithHistory />,
      { finalStatus: 'pending', kycStatus: 'pending' },
    );

    fireEvent.press(getByTestId(VbaKycPendingViewSelectorsIDs.OPEN_PENDING));

    expect(
      getByTestId(VbaKycPendingSelectorsIDs.ILLUSTRATION),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_taking_longer.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_taking_longer.description')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_taking_longer.button')),
    ).toBeOnTheScreen();
    expect(queryByLabelText('Back')).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(VbaKycPendingSelectorsIDs.COME_BACK_LATER_BUTTON),
    );

    expect(
      getByTestId(VbaKycPendingViewSelectorsIDs.OPEN_PENDING),
    ).toBeOnTheScreen();
  });

  it('opens Money home from Come back later when there is no previous screen', async () => {
    const { getByTestId, findByTestId } = renderKycScreen(<PendingAtRoot />, {
      finalStatus: 'pending',
      kycStatus: 'pending',
    });

    fireEvent.press(
      getByTestId(VbaKycPendingSelectorsIDs.COME_BACK_LATER_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.MONEY.HOME)),
    ).toBeOnTheScreen();
  });

  it.each<
    [
      VbaOnboardingSnapshot['kycStatus'],
      VbaOnboardingSnapshot['autorampStatus'],
      string,
    ]
  >([
    ['approved', 'ready', Routes.RAMP.VBA_DETAILS],
    ['rejected', 'not_ready', VbaOnboardingRoutes.KYC_REJECTED],
    ['retry', 'not_ready', VbaOnboardingRoutes.IDENTITY_VERIFICATION],
  ])(
    'opens the next screen when KYC is %s and the account is %s',
    async (kycStatus, autorampStatus, route) => {
      engineContext.RampsController.hydrateVbaOnboarding = jest
        .fn()
        .mockResolvedValue(hydratedSnapshot(kycStatus, autorampStatus));
      const { findByTestId } = renderKycScreen(<RampNavigator />, {
        finalStatus: kycStatus,
        kycStatus,
      });

      expect(
        await findByTestId(
          getRouteProbeTestId(route),
          {},
          { timeout: REDIRECT_TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
    },
  );

  it('opens identity verified and starts account creation when KYC is approved without a usable autoramp', async () => {
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    engineContext.RampsController.hydrateVbaOnboarding = jest
      .fn()
      .mockResolvedValue(hydratedSnapshot('approved', 'needs_source_currency'));
    const { findByTestId, queryByTestId } = renderKycScreen(<RampNavigator />, {
      finalStatus: 'approved',
      kycStatus: 'approved',
    });

    expect(
      await findByTestId(
        VbaIdentityVerifiedSelectorsIDs.CONTAINER,
        {},
        { timeout: REDIRECT_TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    await waitFor(() =>
      expect(engineContext.RampsController.createAutoramp).toHaveBeenCalledWith(
        expect.objectContaining({
          source_currencies: [{ type: 'Fiat', code: 'BRL' }],
        }),
      ),
    );
    expect(engineContext.RampsController.createAutoramp).toHaveBeenCalledTimes(
      1,
    );
    expect(
      queryByTestId(getRouteProbeTestId(Routes.RAMP.VBA_DETAILS)),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(VbaIdentityVerifiedSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });
});
