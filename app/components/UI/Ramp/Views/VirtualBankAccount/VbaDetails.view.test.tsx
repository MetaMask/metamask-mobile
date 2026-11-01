import '../../../../../../tests/component-view/mocks';
import { fireEvent, within } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import I18n, { strings } from '../../../../../../locales/i18n';
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

const UNRESOLVED_COPY = /\[missing|virtual_bank_account\./iu;
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

const expectResolvedCopy = (value: string) => {
  expect(value).not.toMatch(UNRESOLVED_COPY);
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
    engineContext.NeoBankService?.getDepositInstructions.mockResolvedValue({
      type: 'Pix',
      pixKey: PIX_KEY,
      brCode: PIX_CODE,
    });
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
    'leaves Pix details for account support when the autoramp is %s',
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
      const { findByTestId, getByText, queryByTestId, queryByText } =
        renderVbaDetails();

      expect(
        await findByTestId(
          `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`,
        ),
      ).toBeOnTheScreen();
      expect(
        getByText(
          strings('virtual_bank_account.account_create_error.generic.title'),
        ),
      ).toBeOnTheScreen();
      expect(
        getByText(
          strings(
            'virtual_bank_account.account_create_error.details.description',
          ),
        ),
      ).toBeOnTheScreen();
      expect(
        getByText(
          strings('virtual_bank_account.account_create_error.details.primary'),
        ),
      ).toBeOnTheScreen();
      expect(
        queryByText(
          strings('virtual_bank_account.account_create_error.generic.primary'),
        ),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(VbaDetailsSelectorsIDs.PIX_CODE),
      ).not.toBeOnTheScreen();
      expect(ramps.createAutoramp).not.toHaveBeenCalled();
    },
  );

  it('shows the creating-account message while the autoramp is still pending', async () => {
    ramps.state = {
      autoramps: [
        {
          id: 'ar-pending',
          walletAddress: VBA_TEST_MONEY_ADDRESS,
          status: 'Created',
          depositRailsSummary: { currency: 'BRL' },
        },
      ],
    };
    ramps.refreshAutoramp?.mockResolvedValue({
      id: 'ar-pending',
      walletAddress: VBA_TEST_MONEY_ADDRESS,
      status: 'Authorized',
      depositRailsSummary: { currency: 'BRL' },
    });
    const { findByText, queryByTestId } = renderVbaDetails();

    expect(
      await findByText(strings('virtual_bank_account.creating_account.title')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.PIX_CODE),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(`${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`),
    ).not.toBeOnTheScreen();
    expect(ramps.createAutoramp).not.toHaveBeenCalled();
  });

  it('shows the waiting-for-provider message while the account is still pending', async () => {
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
    expect(
      queryByTestId(`${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`),
    ).not.toBeOnTheScreen();
    expect(ramps.createAutoramp).not.toHaveBeenCalled();

    fireEvent.press(getByTestId(VbaCreatingAccountSelectorsIDs.BACK_BUTTON));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
  });

  it('renders Pix details in Portuguese (pt) with resolved copy', async () => {
    const previousLocale = I18n.locale;
    I18n.locale = 'pt';
    ramps.state = { autoramps: [approvedAutoramp()] };
    engineContext.NeoBankService?.getDepositInstructions.mockResolvedValue({
      type: 'Pix',
      pixKey: PIX_KEY,
      brCode: PIX_CODE,
    });

    try {
      const { findByTestId, getByTestId } = renderVbaDetails();
      const title = strings('virtual_bank_account.vba_details.title');
      const description = strings(
        'virtual_bank_account.vba_details.description',
      );
      const pixKeyLabel = strings(
        'virtual_bank_account.vba_details.pix_key_label',
      );

      expect(
        await findByTestId(VbaDetailsSelectorsIDs.PIX_KEY),
      ).toBeOnTheScreen();
      expectResolvedCopy(title);
      expectResolvedCopy(description);
      expectResolvedCopy(pixKeyLabel);
      expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).toHaveTextContent(
        title,
      );
      expect(
        within(getByTestId(VbaDetailsSelectorsIDs.PIX_KEY)).getByText(
          pixKeyLabel,
        ),
      ).toBeOnTheScreen();
    } finally {
      I18n.locale = previousLocale;
    }
  });

  it.todo(
    'Portuguese copy is pending: Pix details must not keep English source text',
  );
});
