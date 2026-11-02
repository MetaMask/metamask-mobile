import '../../../../../../tests/component-view/mocks';
import { act, waitFor, within } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  AutorampStatus,
  type AutorampAccount,
  type AutorampDepositInstructions,
} from '@metamask/ramps-controller';
import { strings } from '../../../../../../locales/i18n';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import Engine from '../../../../../core/Engine';
import { MONEY_MOVEMENT_NEOBANK_FLAG_KEY } from '../../../../../selectors/featureFlagController/moneyAccount';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { VBA_TEST_MONEY_ADDRESS } from '../../../../../../tests/component-view/presets/vba';
import {
  renderVbaDetailsWithNetInfo,
  restoreVbaOfflineReduxServiceStore,
  setVbaNetInfo,
  VBA_OFFLINE_NET_INFO,
  VBA_ONLINE_NET_INFO,
} from '../../../../../../tests/component-view/renderers/vbaOffline';
import { resetMusdAutorampSetupGuard } from './ensureMusdAutoramp';
import {
  clearCachedDepositInstructions,
  setCachedDepositInstructions,
} from './vbaDepositInstructionsCache';
import { VbaCreatingAccountSelectorsIDs } from './VbaCreatingAccount';
import { VbaDetailsSelectorsIDs } from './VbaDetails';

const BRL_AUTORAMP_ID = 'autoramp-brl';
const USD_AUTORAMP_ID = 'autoramp-usd';

const autoramp = (
  id: string,
  status: AutorampStatus,
  currency: 'BRL' | 'USD',
): AutorampAccount => ({
  id,
  customerId: 'customer-1',
  walletAddress: VBA_TEST_MONEY_ADDRESS,
  status,
  lastSeenStatus: status,
  updatedAt: 1_793_000_000_000,
  depositRailsSummary: {
    currency,
    ready: status === AutorampStatus.Approved,
  },
});

const PIX: AutorampDepositInstructions = {
  type: 'Pix',
  brCode: '00020126580014br.gov.bcb.pix0136maria@pix.br5204000053039865802BR',
  instruction: 'Pay with Pix Copia e Cola',
  pixKey: 'maria@pix.br',
};

const US_BANK: AutorampDepositInstructions = {
  type: 'UsBank',
  rail: 'ACH',
  accountHolder: 'Maria Silva',
  routingNumber: '021000021',
  accountNumber: '9876543210',
  bankName: 'Lead Bank',
};

const usdRegionOverrides = (): DeepPartial<RootState> =>
  ({
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
              enabled: true,
              minimumVersion: '0.0.0',
              regions: ['US'],
              regionCurrencies: { US: 'USD' },
            },
          },
        },
      },
    },
  }) as unknown as DeepPartial<RootState>;

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;
const ramps = Engine.context.RampsController as unknown as {
  state?: { autoramps: AutorampAccount[] };
  refreshAutoramp?: jest.Mock;
  createAutoramp?: jest.Mock;
};
const engineContext = Engine.context as unknown as {
  NeoBankService?: { getDepositInstructions: jest.Mock };
};

/** Real-time wait so a skipped request would have had time to start. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

const expectRow = (
  getByTestId: (id: string) => Parameters<typeof within>[0],
  testID: string,
  value: string,
) => {
  expect(within(getByTestId(testID)).getByText(value)).toBeOnTheScreen();
};

describeForPlatforms('VbaDetails with no connectivity', () => {
  let getDepositInstructions: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    netInfoMock.__setMockNetInfo(VBA_OFFLINE_NET_INFO);
    getDepositInstructions = jest.fn().mockResolvedValue(PIX);
    engineContext.NeoBankService = { getDepositInstructions };
    ramps.refreshAutoramp = jest.fn();
    ramps.createAutoramp = jest.fn();
  });

  afterEach(() => {
    restoreVbaOfflineReduxServiceStore();
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    netInfoMock.__resetMockNetInfo();
    delete engineContext.NeoBankService;
    delete ramps.refreshAutoramp;
    delete ramps.createAutoramp;
    ramps.state = { autoramps: [] };
  });

  it('keeps the Pix loading placeholder without a request or an error while offline', async () => {
    ramps.state = {
      autoramps: [autoramp(BRL_AUTORAMP_ID, AutorampStatus.Approved, 'BRL')],
    };
    const { findByTestId, getByTestId, queryByTestId } =
      renderVbaDetailsWithNetInfo();

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.LOADING),
    ).toBeOnTheScreen();
    await settle();

    expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).toHaveTextContent(
      strings('virtual_bank_account.vba_details.title'),
    );
    expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeOnTheScreen();
    expect(queryByTestId(VbaDetailsSelectorsIDs.LOAD_ERROR)).toBeNull();
    expect(queryByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeNull();
    expect(getDepositInstructions).not.toHaveBeenCalled();
    expect(ramps.refreshAutoramp).not.toHaveBeenCalled();
  });

  it('loads the Pix details once connectivity returns', async () => {
    ramps.state = {
      autoramps: [autoramp(BRL_AUTORAMP_ID, AutorampStatus.Approved, 'BRL')],
    };
    const { findByTestId, getByTestId, queryByTestId } =
      renderVbaDetailsWithNetInfo();
    expect(
      await findByTestId(VbaDetailsSelectorsIDs.LOADING),
    ).toBeOnTheScreen();
    await settle();
    expect(getDepositInstructions).not.toHaveBeenCalled();

    await setVbaNetInfo(VBA_ONLINE_NET_INFO);

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.PIX_CODE),
    ).toBeOnTheScreen();
    expect(getDepositInstructions).toHaveBeenCalledWith(BRL_AUTORAMP_ID);
    expectRow(getByTestId, VbaDetailsSelectorsIDs.PIX_KEY, 'maria@pix.br');
    expectRow(getByTestId, VbaDetailsSelectorsIDs.PIX_CODE, PIX.brCode);
    expect(queryByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeNull();
  });

  it('shows Pix details already loaded this session while offline, without refetching', async () => {
    ramps.state = {
      autoramps: [autoramp(BRL_AUTORAMP_ID, AutorampStatus.Approved, 'BRL')],
    };
    setCachedDepositInstructions(BRL_AUTORAMP_ID, PIX);
    const { findByTestId, getByTestId, queryByTestId } =
      renderVbaDetailsWithNetInfo();

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.PIX_CODE),
    ).toBeOnTheScreen();
    await settle();

    expectRow(getByTestId, VbaDetailsSelectorsIDs.PIX_KEY, 'maria@pix.br');
    expectRow(getByTestId, VbaDetailsSelectorsIDs.PIX_CODE, PIX.brCode);
    expect(queryByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeNull();
    expect(getDepositInstructions).not.toHaveBeenCalled();
  });

  it('keeps the USD bank placeholder while offline and loads the rows once connectivity returns', async () => {
    getDepositInstructions.mockResolvedValue(US_BANK);
    ramps.state = {
      autoramps: [autoramp(USD_AUTORAMP_ID, AutorampStatus.Approved, 'USD')],
    };
    const { findByTestId, getByTestId, queryByTestId } =
      renderVbaDetailsWithNetInfo({
        location: 'US',
        overrides: usdRegionOverrides(),
      });

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.LOADING),
    ).toBeOnTheScreen();
    await settle();
    expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).toHaveTextContent(
      strings('virtual_bank_account.vba_details.bank_transfer_title'),
    );
    expect(queryByTestId(VbaDetailsSelectorsIDs.LOAD_ERROR)).toBeNull();
    expect(getDepositInstructions).not.toHaveBeenCalled();

    await setVbaNetInfo(VBA_ONLINE_NET_INFO);

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.ACCOUNT_NUMBER),
    ).toBeOnTheScreen();
    expect(getDepositInstructions).toHaveBeenCalledWith(USD_AUTORAMP_ID);
    expectRow(
      getByTestId,
      VbaDetailsSelectorsIDs.ACCOUNT_HOLDER,
      'Maria Silva',
    );
    expectRow(getByTestId, VbaDetailsSelectorsIDs.ROUTING_NUMBER, '021000021');
    expectRow(getByTestId, VbaDetailsSelectorsIDs.ACCOUNT_NUMBER, '9876543210');
    expectRow(getByTestId, VbaDetailsSelectorsIDs.BANK_NAME, 'Lead Bank');
  });

  it('stays on creating your account while offline and finishes once connectivity returns', async () => {
    ramps.state = {
      autoramps: [autoramp(BRL_AUTORAMP_ID, AutorampStatus.Created, 'BRL')],
    };
    ramps.refreshAutoramp?.mockResolvedValue(
      autoramp(BRL_AUTORAMP_ID, AutorampStatus.Approved, 'BRL'),
    );
    const { findByTestId, getByText } = renderVbaDetailsWithNetInfo();

    expect(
      await findByTestId(VbaCreatingAccountSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    await settle();
    expect(
      getByText(strings('virtual_bank_account.creating_account.title')),
    ).toBeOnTheScreen();
    expect(ramps.refreshAutoramp).not.toHaveBeenCalled();
    expect(ramps.createAutoramp).not.toHaveBeenCalled();

    await setVbaNetInfo(VBA_ONLINE_NET_INFO);

    await waitFor(() =>
      expect(ramps.refreshAutoramp).toHaveBeenCalledWith(BRL_AUTORAMP_ID),
    );
    expect(
      await findByTestId(VbaDetailsSelectorsIDs.PIX_CODE),
    ).toBeOnTheScreen();
    expect(getDepositInstructions).toHaveBeenCalledWith(BRL_AUTORAMP_ID);
  });
});
