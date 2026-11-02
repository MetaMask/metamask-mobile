import '../../../../../../tests/component-view/mocks';
import NetInfo from '@react-native-community/netinfo';
import { fireEvent } from '@testing-library/react-native';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import Engine from '../../../../../core/Engine';
import I18n, { setLocale, strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  renderVbaMoneyEntry,
  restoreVbaReduxServiceStore,
  VbaRendererTestIds,
} from '../../../../../../tests/component-view/renderers/vba';
import { CreateVirtualBankAccountSelectorsIDs } from '../../../Ramp/Views/VirtualBankAccount/CreateVirtualBankAccount.testIds';
import { resetMusdAutorampSetupGuard } from '../../../Ramp/Views/VirtualBankAccount/ensureMusdAutoramp';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';

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

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const mockHydrateVbaOnboarding = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);
const mockFetchVendorDisclaimers = jest.mocked(
  Engine.context.KycController.fetchVendorDisclaimers,
);

describeForPlatforms('MoneyAddMoneySheet in Brazilian Portuguese', () => {
  let previousLocale: string;

  beforeEach(() => {
    jest.clearAllMocks();
    previousLocale = I18n.locale;
    mockFetchVendorDisclaimers.mockResolvedValue([
      {
        id: 'vendor-terms',
        url: 'https://moonpay.example/terms',
        display_name: "MoonPay's Terms and Conditions",
      },
    ]);
    mockHydrateVbaOnboarding.mockResolvedValue({
      sessionExists: false,
      vendorDisclaimersComplete: false,
      sessionDisclaimersComplete: false,
      providerFlowStatus: 'not_started',
      kycStatus: 'none',
      autorampStatus: 'not_ready',
    });
  });

  afterEach(() => {
    I18n.locale = previousLocale;
    restoreVbaReduxServiceStore();
    resetMusdAutorampSetupGuard();
    netInfoMock.__resetMockNetInfo();
  });

  it.each(BRAZILIAN_LOCALES)(
    'shows Add funds in Portuguese and opens BRL bank setup for $name',
    async ({ apply }) => {
      await apply();
      const title = expectPortugueseCopy('money.add_money_sheet.title');
      const convertCrypto = expectPortugueseCopy(
        'money.add_money_sheet.convert_crypto',
      );

      const { findByTestId, getByTestId, getByText } = renderVbaMoneyEntry();
      fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));

      expect(
        await findByTestId(MoneyAddMoneySheetTestIds.CONTAINER),
      ).toBeOnTheScreen();
      expect(getByText(title)).toBeOnTheScreen();
      expect(
        getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
      ).toHaveTextContent(convertCrypto, { exact: false });

      fireEvent.press(getByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW));

      expect(
        await findByTestId(CreateVirtualBankAccountSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    },
  );
});
