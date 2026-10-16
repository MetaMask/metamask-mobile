import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import renderWithProvider, {
  type DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import { initialStateWallet } from '../../../../../../tests/component-view/presets/wallet';
import { VbaOnboardingRoutes } from '../../../Ramp/Views/VirtualBankAccount/routes';
import VbaIdentityVerified, {
  VbaIdentityVerifiedSelectorsIDs,
} from './IdentityVerified';

const OnboardingStack = createNativeStackNavigator();
const RampStack = createNativeStackNavigator();
const MoneyRootStack = createNativeStackNavigator();
const MoneyHomeStack = createNativeStackNavigator();

const RouteProbe =
  (routeName: string): React.FC =>
  () => <Text testID={getRouteProbeTestId(routeName)}>{routeName}</Text>;

const detailsProbe = RouteProbe(Routes.RAMP.VBA_DETAILS);
const moneyHomeProbe = RouteProbe(Routes.MONEY.HOME);

const OnboardingNavigator = () => (
  <OnboardingStack.Navigator
    initialRouteName={VbaOnboardingRoutes.IDENTITY_VERIFIED}
    screenOptions={{ headerShown: false }}
  >
    <OnboardingStack.Screen
      name={VbaOnboardingRoutes.IDENTITY_VERIFIED}
      component={VbaIdentityVerified}
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

const IdentityVerifiedFlow = () => (
  <RampStack.Navigator
    initialRouteName={Routes.RAMP.VBA_ONBOARDING}
    screenOptions={{ headerShown: false }}
  >
    <RampStack.Screen
      name={Routes.RAMP.VBA_ONBOARDING}
      component={OnboardingNavigator}
    />
    <RampStack.Screen name={Routes.RAMP.VBA_DETAILS} component={detailsProbe} />
    <RampStack.Screen name={Routes.HOME_TABS} component={MoneyRootNavigator} />
  </RampStack.Navigator>
);

const rampsController = Engine.context.RampsController as {
  registerMoneyAccountWallet?: jest.Mock;
  createAutoramp?: jest.Mock;
};

describeForPlatforms('VbaIdentityVerified view', () => {
  beforeEach(() => {
    rampsController.registerMoneyAccountWallet = jest.fn();
    rampsController.createAutoramp = jest.fn();
  });

  it('opens account details from Continue without signing or creating an account', async () => {
    const { findByTestId, getByTestId, getByText } = renderWithProvider(
      <IdentityVerifiedFlow />,
      {
        state: initialStateWallet().build() as DeepPartial<RootState>,
      },
    );

    expect(
      getByText(strings('virtual_bank_account.identity_verified.title')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaIdentityVerifiedSelectorsIDs.ILLUSTRATION),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.RAMP.VBA_DETAILS)),
    ).toBeOnTheScreen();
    expect(rampsController.registerMoneyAccountWallet).not.toHaveBeenCalled();
    expect(rampsController.createAutoramp).not.toHaveBeenCalled();
  });

  it('returns to Money home from Back', async () => {
    const { findByTestId, getByTestId } = renderWithProvider(
      <IdentityVerifiedFlow />,
      {
        state: initialStateWallet().build() as DeepPartial<RootState>,
      },
    );

    fireEvent.press(getByTestId(VbaIdentityVerifiedSelectorsIDs.BACK_BUTTON));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.MONEY.HOME)),
    ).toBeOnTheScreen();
    expect(rampsController.registerMoneyAccountWallet).not.toHaveBeenCalled();
    expect(rampsController.createAutoramp).not.toHaveBeenCalled();
  });
});
