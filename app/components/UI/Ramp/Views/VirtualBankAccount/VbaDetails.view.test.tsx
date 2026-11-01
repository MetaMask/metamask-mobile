import '../../../../../../tests/component-view/mocks';
import { fireEvent, within } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import I18n, { strings } from '../../../../../../locales/i18n';
import en from '../../../../../../locales/languages/en.json';
import pt from '../../../../../../locales/languages/pt.json';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import { VBA_TEST_MONEY_ADDRESS } from '../../../../../../tests/component-view/presets/vba';
import {
  renderVbaDetails,
  restoreVbaReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vba';
import { resetMusdAutorampSetupGuard } from './ensureMusdAutoramp';
import { clearCachedDepositInstructions } from './vbaDepositInstructionsCache';
import { VbaAccountCreateErrorSelectorsIDs } from './VbaAccountCreateError';
import { VbaCreatingAccountSelectorsIDs } from './VbaCreatingAccount';
import { VbaDetailsSelectorsIDs } from './VbaDetails';

const PIX_KEY = 'maria@pix.br';
const PIX_CODE = '00020126580014br.gov.bcb.pix';

interface TestAutoramp {
  id: string;
  walletAddress: string;
  status: string;
  depositRailsSummary?: { currency?: string };
}

const ramps = Engine.context.RampsController as unknown as {
  state?: { autoramps: TestAutoramp[] };
  hydrateVbaOnboarding: jest.Mock;
  refreshAutoramp?: jest.Mock;
  createAutoramp?: jest.Mock;
  registerMoneyAccountWallet?: jest.Mock;
};
const engineContext = Engine.context as unknown as {
  NeoBankService?: { getDepositInstructions: jest.Mock };
};
const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const approvedAutoramp = (): TestAutoramp => ({
  id: 'ar-brl',
  walletAddress: VBA_TEST_MONEY_ADDRESS,
  status: 'Approved',
  depositRailsSummary: { currency: 'BRL' },
});

const createdAutoramp = (): TestAutoramp => ({
  id: 'ar-pending',
  walletAddress: VBA_TEST_MONEY_ADDRESS,
  status: 'Created',
  depositRailsSummary: { currency: 'BRL' },
});

const VBA_DETAILS_KEYS = [
  'title',
  'description',
  'helper_text',
  'copia_cola_label',
  'pix_key_label',
  'bank_transfer_title',
  'bank_transfer_description',
  'account_holder_label',
  'routing_number_label',
  'account_number_label',
  'bank_name_label',
  'copy_label',
  'copied_label',
  'button',
  'loading_details',
  'load_error',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const untranslatedLeafKeys = (
  english: unknown,
  portuguese: unknown,
  path: string,
): string[] => {
  if (typeof english === 'string') {
    if (typeof portuguese !== 'string') {
      return [`${path} (missing)`];
    }
    if (portuguese === english) {
      return [`${path} (identical to en)`];
    }
    return [];
  }
  if (!isRecord(english)) {
    return [];
  }
  return Object.entries(english).flatMap(([key, child]) =>
    untranslatedLeafKeys(
      child,
      isRecord(portuguese) ? portuguese[key] : undefined,
      `${path}.${key}`,
    ),
  );
};

const pixInstructions = {
  type: 'Pix',
  pixKey: PIX_KEY,
  brCode: PIX_CODE,
};

describeForPlatforms('VbaDetails view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    ramps.state = { autoramps: [] };
    ramps.hydrateVbaOnboarding.mockResolvedValue({
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'submitted',
      kycStatus: 'approved',
      autorampStatus: 'not_ready',
    });
    ramps.refreshAutoramp = jest.fn();
    ramps.createAutoramp = jest.fn();
    ramps.registerMoneyAccountWallet = jest.fn();
    engineContext.NeoBankService = {
      getDepositInstructions: jest.fn().mockResolvedValue(null),
    };
  });

  afterEach(() => {
    restoreVbaReduxServiceStore();
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    netInfoMock.__resetMockNetInfo();
    delete engineContext.NeoBankService;
    ramps.state = { autoramps: [] };
  });

  it('shows the Pix key and Copia e Cola once deposit instructions load', async () => {
    ramps.state = { autoramps: [approvedAutoramp()] };
    engineContext.NeoBankService?.getDepositInstructions.mockResolvedValue(
      pixInstructions,
    );
    const { findByTestId, getByTestId } = renderVbaDetails();

    const pixKeyRow = await findByTestId(VbaDetailsSelectorsIDs.PIX_KEY);
    const pixCodeRow = getByTestId(VbaDetailsSelectorsIDs.PIX_CODE);

    expect(
      within(pixKeyRow).getByText(
        strings('virtual_bank_account.vba_details.pix_key_label'),
      ),
    ).toBeOnTheScreen();
    expect(within(pixKeyRow).getByText(PIX_KEY)).toBeOnTheScreen();
    expect(
      within(pixCodeRow).getByText(
        strings('virtual_bank_account.vba_details.copia_cola_label'),
      ),
    ).toBeOnTheScreen();
    expect(within(pixCodeRow).getByText(PIX_CODE)).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(`${VbaDetailsSelectorsIDs.COPY_BUTTON}-pix-key`),
    );

    expect(Clipboard.setString).toHaveBeenCalledWith(PIX_KEY);
    expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
  });

  it('shows the deposit load error when Pix details fail', async () => {
    ramps.state = { autoramps: [approvedAutoramp()] };
    engineContext.NeoBankService?.getDepositInstructions.mockRejectedValue(
      new Error('details failed'),
    );
    const { findByTestId, getByTestId, queryByTestId } = renderVbaDetails();

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.LOAD_ERROR),
    ).toHaveTextContent(strings('virtual_bank_account.vba_details.load_error'));
    expect(queryByTestId(VbaDetailsSelectorsIDs.PIX_KEY)).not.toBeOnTheScreen();
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.PIX_CODE),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(VbaDetailsSelectorsIDs.DONE_BUTTON));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
  });

  it.each(['Rejected', 'Cancelled'] as const)(
    'opens support from the account error when the autoramp is %s',
    async (status) => {
      ramps.state = {
        autoramps: [
          {
            id: 'ar-terminal',
            walletAddress: VBA_TEST_MONEY_ADDRESS,
            status,
            depositRailsSummary: { currency: 'BRL' },
          },
        ],
      };
      const {
        findByTestId,
        getByText,
        getByTestId,
        queryByTestId,
        queryByText,
      } = renderVbaDetails();

      expect(
        await findByTestId(
          `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`,
        ),
      ).toBeOnTheScreen();
      expect(
        queryByText(
          strings('virtual_bank_account.account_create_error.generic.primary'),
        ),
      ).not.toBeOnTheScreen();
      expect(
        getByText(
          strings('virtual_bank_account.account_create_error.details.primary'),
        ),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(VbaDetailsSelectorsIDs.PIX_CODE),
      ).not.toBeOnTheScreen();
      expect(ramps.createAutoramp).not.toHaveBeenCalled();

      fireEvent.press(
        getByTestId(VbaAccountCreateErrorSelectorsIDs.PRIMARY_BUTTON),
      );

      expect(await findByTestId('support-consent-sheet')).toBeOnTheScreen();
      expect(ramps.createAutoramp).not.toHaveBeenCalled();
    },
  );

  it('opens the generic account error when refresh turns the autoramp Rejected', async () => {
    ramps.state = { autoramps: [createdAutoramp()] };
    ramps.refreshAutoramp?.mockResolvedValue({
      ...createdAutoramp(),
      status: 'Rejected',
    });
    const { findByTestId, getByTestId, queryByTestId } = renderVbaDetails();

    expect(
      await findByTestId(
        `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`,
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(`${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-details`),
    ).not.toBeOnTheScreen();
    expect(ramps.createAutoramp).not.toHaveBeenCalled();

    fireEvent.press(
      getByTestId(VbaAccountCreateErrorSelectorsIDs.PRIMARY_BUTTON),
    );

    expect(await findByTestId('support-consent-sheet')).toBeOnTheScreen();
  });

  it('opens the details account error when refresh returns RegistrationFailed', async () => {
    ramps.state = { autoramps: [createdAutoramp()] };
    ramps.refreshAutoramp?.mockResolvedValue({
      ...createdAutoramp(),
      status: 'RegistrationFailed',
    });
    const { findByTestId, getByTestId, getByText, queryByTestId } =
      renderVbaDetails();

    expect(
      await findByTestId(
        `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-details`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('virtual_bank_account.account_create_error.details.title'),
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(`${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(VbaAccountCreateErrorSelectorsIDs.PRIMARY_BUTTON),
    );

    expect(await findByTestId('support-consent-sheet')).toBeOnTheScreen();
    expect(ramps.createAutoramp).not.toHaveBeenCalled();
  });

  it('replaces the creating message with Pix details on the same poll', async () => {
    let releaseRefresh: (autoramp: TestAutoramp) => void = () => undefined;
    ramps.state = { autoramps: [createdAutoramp()] };
    ramps.refreshAutoramp?.mockReturnValue(
      new Promise<TestAutoramp>((resolve) => {
        releaseRefresh = resolve;
      }),
    );
    engineContext.NeoBankService?.getDepositInstructions.mockResolvedValue(
      pixInstructions,
    );
    const { findByText, findByTestId, getByTestId, queryByText } =
      renderVbaDetails();

    expect(
      await findByText(strings('virtual_bank_account.creating_account.title')),
    ).toBeOnTheScreen();
    expect(queryByText(PIX_CODE)).not.toBeOnTheScreen();

    releaseRefresh({ ...createdAutoramp(), status: 'Approved' });

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.PIX_CODE),
    ).toBeOnTheScreen();
    expect(
      within(getByTestId(VbaDetailsSelectorsIDs.PIX_KEY)).getByText(PIX_KEY),
    ).toBeOnTheScreen();
    expect(
      queryByText(strings('virtual_bank_account.creating_account.title')),
    ).not.toBeOnTheScreen();
  });

  it('shows the creating-account message while the autoramp is still pending', async () => {
    ramps.state = { autoramps: [createdAutoramp()] };
    ramps.refreshAutoramp?.mockResolvedValue({
      ...createdAutoramp(),
      status: 'Authorized',
    });
    const { findByText, findByTestId, getByTestId, queryByTestId } =
      renderVbaDetails();

    expect(
      await findByText(strings('virtual_bank_account.creating_account.title')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.PIX_CODE),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(`${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(VbaCreatingAccountSelectorsIDs.BACK_BUTTON));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
    expect(ramps.createAutoramp).not.toHaveBeenCalled();
  });

  it('shows the waiting-for-provider message while MoonPay has not approved the account', async () => {
    const { findByText, findByTestId, getByTestId, queryByTestId } =
      renderVbaDetails();

    expect(
      await findByText(
        strings('virtual_bank_account.creating_account.awaiting_provider'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaCreatingAccountSelectorsIDs.SPINNER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(ramps.createAutoramp).not.toHaveBeenCalled();

    fireEvent.press(getByTestId(VbaCreatingAccountSelectorsIDs.BACK_BUTTON));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
  });

  it('renders Pix details in Portuguese without raw keys', async () => {
    const previousLocale = I18n.locale;
    I18n.locale = 'pt';
    ramps.state = { autoramps: [approvedAutoramp()] };
    engineContext.NeoBankService?.getDepositInstructions.mockResolvedValue(
      pixInstructions,
    );

    try {
      const { findByTestId, getByTestId } = renderVbaDetails();

      expect(
        await findByTestId(VbaDetailsSelectorsIDs.PIX_KEY),
      ).toBeOnTheScreen();
      expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).not.toHaveTextContent(
        /\[missing|virtual_bank_account\./i,
      );
      expect(
        getByTestId(VbaDetailsSelectorsIDs.CONTAINER),
      ).not.toHaveTextContent(/\[missing|virtual_bank_account\./i);
    } finally {
      I18n.locale = previousLocale;
    }
  });

  it.failing(
    'Portuguese copy is pending: Pix detail keys must not be missing or identical to English',
    () => {
      const englishDetails = en.virtual_bank_account.vba_details;
      const portugueseDetails = pt.virtual_bank_account.vba_details;
      const flagged = VBA_DETAILS_KEYS.flatMap((key) =>
        untranslatedLeafKeys(
          englishDetails[key],
          portugueseDetails[key],
          `virtual_bank_account.vba_details.${key}`,
        ),
      );

      expect(flagged).toEqual([]);
    },
  );
});
