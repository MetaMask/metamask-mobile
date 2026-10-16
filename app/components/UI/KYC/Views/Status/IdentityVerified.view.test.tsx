import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent } from '@testing-library/react-native';
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

const Onboarding = createNativeStackNavigator();
const Root = createNativeStackNavigator();
const Probe =
  (name: string): React.FC =>
  () => <Text testID={getRouteProbeTestId(name)}>{name}</Text>;

const OnboardingNavigator = () => (
  <Onboarding.Navigator
    initialRouteName={VbaOnboardingRoutes.IDENTITY_VERIFIED}
    screenOptions={{ headerShown: false }}
  >
    <Onboarding.Screen
      name={VbaOnboardingRoutes.IDENTITY_VERIFIED}
      component={VbaIdentityVerified}
    />
  </Onboarding.Navigator>
);

const Flow = () => (
  <Root.Navigator
    initialRouteName={Routes.RAMP.VBA_ONBOARDING}
    screenOptions={{ headerShown: false }}
  >
    <Root.Screen
      name={Routes.RAMP.VBA_ONBOARDING}
      component={OnboardingNavigator}
    />
    <Root.Screen
      name={Routes.RAMP.VBA_DETAILS}
      component={Probe(Routes.RAMP.VBA_DETAILS)}
    />
    <Root.Screen name={Routes.HOME_TABS} component={Probe(Routes.MONEY.HOME)} />
  </Root.Navigator>
);

const ramps = Engine.context.RampsController as {
  registerMoneyAccountWallet?: jest.Mock;
  createAutoramp?: jest.Mock;
};

describeForPlatforms('VbaIdentityVerified view', () => {
  beforeEach(() => {
    ramps.registerMoneyAccountWallet = jest.fn();
    ramps.createAutoramp = jest.fn();
  });

  const render = () =>
    renderWithProvider(<Flow />, {
      state: initialStateWallet().build() as DeepPartial<RootState>,
    });

  it('opens account details from Continue without signing or creating', async () => {
    const { findByTestId, getByTestId } = render();

    fireEvent.press(
      getByTestId(VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.RAMP.VBA_DETAILS)),
    ).toBeOnTheScreen();
    expect(ramps.registerMoneyAccountWallet).not.toHaveBeenCalled();
    expect(ramps.createAutoramp).not.toHaveBeenCalled();
  });

  it('returns to Money home from Back', async () => {
    const { findByTestId, getByTestId } = render();

    fireEvent.press(getByTestId(VbaIdentityVerifiedSelectorsIDs.BACK_BUTTON));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.MONEY.HOME)),
    ).toBeOnTheScreen();
  });
});
