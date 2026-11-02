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
import I18n, { setLocale, strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import { initialStateVba } from '../../../../../../tests/component-view/presets/vba';
import { VbaOnboardingRoutes } from '../../../Ramp/Views/VirtualBankAccount/routes';
import { resetMusdAutorampSetupGuard } from '../../../Ramp/Views/VirtualBankAccount/ensureMusdAutoramp';
import VbaIdentityVerified, {
  VbaIdentityVerifiedSelectorsIDs,
} from './IdentityVerified';

// i18n registers only `pt`. A Brazilian phone reports `pt-BR`, which must
// resolve through the `pt-BR` -> `pt` fallback rather than English.
const BRAZILIAN_LOCALES = [
  {
    name: 'a pt-BR phone with no app language picked',
    apply: async () => {
      I18n.locale = 'pt-BR';
    },
  },
  {
    name: 'the app set to Português (Brasil)',
    apply: async () => {
      await setLocale('pt');
    },
  },
];

const expectPortugueseCopy = (key: string): string => {
  const copy = strings(key);
  expect(copy).not.toBe(I18n.t(key, { locale: 'en' }));
  expect(copy).toBe(I18n.t(key, { locale: 'pt' }));
  return copy;
};

const Onboarding = createNativeStackNavigator();
const Root = createNativeStackNavigator();
const Probe =
  (name: string): React.FC =>
  () => <Text testID={getRouteProbeTestId(name)}>{name}</Text>;
const DetailsProbe = Probe(Routes.RAMP.VBA_DETAILS);
const MoneyHomeProbe = Probe(Routes.MONEY.HOME);

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
    <Root.Screen name={Routes.RAMP.VBA_DETAILS} component={DetailsProbe} />
    <Root.Screen name={Routes.HOME_TABS} component={MoneyHomeProbe} />
  </Root.Navigator>
);

interface TestAutoramp {
  id: string;
  walletAddress: string;
  status: string;
}

const ramps = Engine.context.RampsController as unknown as {
  state?: { autoramps: TestAutoramp[] };
  hydrateVbaOnboarding?: jest.Mock;
  registerMoneyAccountWallet?: jest.Mock;
  createAutoramp?: jest.Mock;
};
const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const renderBrazilianIdentityVerified = () =>
  renderWithProvider(<Flow />, {
    state: initialStateVba({ location: 'BR-SP' })
      .withOverrides({
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                moneyMovementNeobank: {
                  enabled: true,
                  minimumVersion: '0.0.0',
                  regions: ['BR'],
                  regionCurrencies: { BR: 'BRL' },
                  defaultCurrency: 'BRL',
                  chooseCurrency: false,
                },
              },
            },
          },
        },
      } as DeepPartial<RootState>)
      .build() as DeepPartial<RootState>,
  });

describeForPlatforms('VbaIdentityVerified in Brazilian Portuguese', () => {
  let previousLocale: string;

  beforeEach(() => {
    previousLocale = I18n.locale;
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    resetMusdAutorampSetupGuard();
    ramps.state = { autoramps: [] };
    ramps.hydrateVbaOnboarding = jest
      .fn()
      .mockResolvedValue({ autorampStatus: 'needs_source_currency' });
    ramps.registerMoneyAccountWallet = jest.fn();
    ramps.createAutoramp = jest.fn();
  });

  afterEach(() => {
    I18n.locale = previousLocale;
    netInfoMock.__resetMockNetInfo();
  });

  it.each(BRAZILIAN_LOCALES)(
    'shows Identity verified in Portuguese and continues to the BRL details for $name',
    async ({ apply }) => {
      await apply();
      const title = expectPortugueseCopy(
        'virtual_bank_account.identity_verified.title',
      );
      const description = expectPortugueseCopy(
        'virtual_bank_account.identity_verified.description',
      );
      const button = expectPortugueseCopy(
        'virtual_bank_account.identity_verified.button',
      );

      const { findByTestId, getByTestId, getByText } =
        renderBrazilianIdentityVerified();

      expect(getByText(title)).toBeOnTheScreen();
      expect(getByText(description)).toBeOnTheScreen();
      expect(
        getByTestId(VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
      ).toHaveTextContent(button);

      fireEvent.press(
        getByTestId(VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
      );

      expect(
        await findByTestId(getRouteProbeTestId(Routes.RAMP.VBA_DETAILS)),
      ).toBeOnTheScreen();
      expect(ramps.createAutoramp).not.toHaveBeenCalled();
    },
  );
});
