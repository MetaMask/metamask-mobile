import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import renderWithProvider, {
  type DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import { initialStateVba } from '../../../../../../tests/component-view/presets/vba';
import { VbaOnboardingRoutes } from '../../../Ramp/Views/VirtualBankAccount/routes';
import VbaDetails, {
  VbaDetailsSelectorsIDs,
} from '../../../Ramp/Views/VirtualBankAccount/VbaDetails';
import { resetMusdAutorampSetupGuard } from '../../../Ramp/Views/VirtualBankAccount/ensureMusdAutoramp';
import VbaChooseCurrency from '../../../Ramp/Views/VirtualBankAccount/VbaChooseCurrency';
import { VbaChooseCurrencySelectorsIDs } from '../../../Ramp/Views/VirtualBankAccount/VbaChooseCurrency.testIds';
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
    <Onboarding.Screen
      name={VbaOnboardingRoutes.CHOOSE_CURRENCY}
      component={VbaChooseCurrency}
    />
  </Onboarding.Navigator>
);

const createFlow = (DetailsScreen: React.ComponentType) => {
  const Flow = () => (
    <Root.Navigator
      initialRouteName={Routes.RAMP.VBA_ONBOARDING}
      screenOptions={{ headerShown: false }}
    >
      <Root.Screen
        name={Routes.RAMP.VBA_ONBOARDING}
        component={OnboardingNavigator}
      />
      <Root.Screen name={Routes.RAMP.VBA_DETAILS} component={DetailsScreen} />
      <Root.Screen
        name={Routes.HOME_TABS}
        component={Probe(Routes.MONEY.HOME)}
      />
    </Root.Navigator>
  );
  return Flow;
};

interface TestAutoramp {
  id: string;
  walletAddress: string;
  status: string;
}

const ramps = Engine.context.RampsController as unknown as {
  state?: { autoramps: TestAutoramp[] };
  hydrateVbaOnboarding?: jest.Mock;
  refreshAutoramp?: jest.Mock;
  registerMoneyAccountWallet?: jest.Mock;
  createAutoramp?: jest.Mock;
};
const engineContext = Engine.context as unknown as {
  NeoBankService?: { getDepositInstructions: jest.Mock };
};
const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

describeForPlatforms('VbaIdentityVerified view', () => {
  afterEach(() => {
    netInfoMock.__resetMockNetInfo();
  });

  beforeEach(() => {
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    resetMusdAutorampSetupGuard();
    ramps.state = { autoramps: [] };
    ramps.hydrateVbaOnboarding = jest
      .fn()
      .mockResolvedValue({ autorampStatus: 'needs_source_currency' });
    ramps.refreshAutoramp = jest.fn();
    ramps.registerMoneyAccountWallet = jest.fn();
    ramps.createAutoramp = jest.fn();
    engineContext.NeoBankService = {
      getDepositInstructions: jest.fn().mockResolvedValue(null),
    };
  });

  const render = (
    DetailsScreen: React.ComponentType,
    { chooseCurrency = false } = {},
  ) => {
    const Flow = createFlow(DetailsScreen);
    return renderWithProvider(<Flow />, {
      state: initialStateVba({ location: 'BR-SP' })
        .withOverrides({
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  moneyMovementNeobank: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                    chooseCurrency,
                  },
                  moneyMovementNeobankBrl: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                    currency: 'BRL',
                    regions: ['BR'],
                    layout: 'Pix',
                  },
                },
              },
            },
          },
        } as DeepPartial<RootState>)
        .build() as DeepPartial<RootState>,
    });
  };

  it('opens account details from Continue without signing or creating', async () => {
    const { findByTestId, getByTestId } = render(
      Probe(Routes.RAMP.VBA_DETAILS),
    );

    fireEvent.press(
      getByTestId(VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.RAMP.VBA_DETAILS)),
    ).toBeOnTheScreen();
    expect(ramps.registerMoneyAccountWallet).not.toHaveBeenCalled();
    expect(ramps.createAutoramp).not.toHaveBeenCalled();
  });

  it('shows Creating your bank account, then the details once the BRL autoramp is Approved', async () => {
    let releaseCreate: () => void = () => undefined;
    const createGate = new Promise<void>((resolve) => {
      releaseCreate = resolve;
    });
    ramps.createAutoramp?.mockImplementation(
      async (request: { recipient_account: { address: string } }) => {
        await createGate;
        const autoramp = {
          id: 'ar-new',
          walletAddress: request.recipient_account.address,
          status: 'Created',
        };
        ramps.state = { autoramps: [autoramp] };
        return autoramp;
      },
    );
    ramps.refreshAutoramp?.mockImplementation(async (id: string) => ({
      ...ramps.state?.autoramps.find((autoramp) => autoramp.id === id),
      status: 'Approved',
    }));
    engineContext.NeoBankService?.getDepositInstructions.mockResolvedValue({
      type: 'Pix',
      brCode: '00020126',
      instruction: 'Pay with PIX',
    });
    const { findByTestId, findByText, getByTestId } = render(VbaDetails);

    fireEvent.press(
      getByTestId(VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(
      await findByText(strings('virtual_bank_account.creating_account.title')),
    ).toBeOnTheScreen();
    releaseCreate();
    expect(
      await findByTestId(VbaDetailsSelectorsIDs.PIX_CODE),
    ).toBeOnTheScreen();
    expect(ramps.createAutoramp).toHaveBeenCalledTimes(1);
    expect(ramps.createAutoramp).toHaveBeenCalledWith(
      expect.objectContaining({
        source_currencies: [{ type: 'Fiat', code: 'BRL' }],
      }),
    );
  });

  it('opens Choose Currency from Continue when chooseCurrency is on', async () => {
    const { findByTestId, getByTestId, queryByTestId } = render(VbaDetails, {
      chooseCurrency: true,
    });

    fireEvent.press(
      getByTestId(VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(
      await findByTestId(VbaChooseCurrencySelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${VbaChooseCurrencySelectorsIDs.CURRENCY_ROW}-BRL`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${VbaChooseCurrencySelectorsIDs.CURRENCY_ROW}-USD`),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(`${VbaChooseCurrencySelectorsIDs.CURRENCY_ROW}-EUR`),
    ).toBeNull();
    expect(ramps.createAutoramp).not.toHaveBeenCalled();
  });

  it('ignores the currency picked on Choose Currency and creates the country market currency', async () => {
    ramps.createAutoramp?.mockImplementation(
      async (request: { recipient_account: { address: string } }) => {
        const autoramp = {
          id: 'ar-new',
          walletAddress: request.recipient_account.address,
          status: 'Created',
        };
        ramps.state = { autoramps: [autoramp] };
        return autoramp;
      },
    );
    ramps.refreshAutoramp?.mockResolvedValue({ status: 'Created' });
    const { findByTestId, findByText, getByTestId } = render(VbaDetails, {
      chooseCurrency: true,
    });

    fireEvent.press(
      getByTestId(VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );
    fireEvent.press(
      await findByTestId(`${VbaChooseCurrencySelectorsIDs.CURRENCY_ROW}-USD`),
    );

    expect(
      await findByText(strings('virtual_bank_account.creating_account.title')),
    ).toBeOnTheScreen();
    expect(ramps.createAutoramp).toHaveBeenCalledWith(
      expect.objectContaining({
        source_currencies: [{ type: 'Fiat', code: 'BRL' }],
      }),
    );
  });

  it('returns to Identity verified from the Choose Currency back button', async () => {
    const { findByTestId, getByTestId } = render(
      Probe(Routes.RAMP.VBA_DETAILS),
      { chooseCurrency: true },
    );

    fireEvent.press(
      getByTestId(VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );
    fireEvent.press(
      await findByTestId(VbaChooseCurrencySelectorsIDs.BACK_BUTTON),
    );

    expect(
      await findByTestId(VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('returns to Money home from Back', async () => {
    const { findByTestId, getByTestId } = render(
      Probe(Routes.RAMP.VBA_DETAILS),
    );

    fireEvent.press(getByTestId(VbaIdentityVerifiedSelectorsIDs.BACK_BUTTON));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.MONEY.HOME)),
    ).toBeOnTheScreen();
  });
});
