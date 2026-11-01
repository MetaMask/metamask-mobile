import '../../../../../../tests/component-view/mocks';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import { HttpError } from '@metamask/controller-utils';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { MONEY_MOVEMENT_NEOBANK_FLAG_KEY } from '../../../../../selectors/featureFlagController/moneyAccount';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { VBA_TEST_MONEY_ADDRESS } from '../../../../../../tests/component-view/presets/vba';
import {
  renderVbaDetails,
  restoreVbaReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vba';
import { resetMusdAutorampSetupGuard } from './ensureMusdAutoramp';
import { clearCachedDepositInstructions } from './vbaDepositInstructionsCache';
import { VbaAccountCreateErrorSelectorsIDs } from './VbaAccountCreateError';
import { VbaDetailsSelectorsIDs } from './VbaDetails';

interface TestAutoramp {
  id: string;
  walletAddress: string;
  status: string;
  depositRailsSummary: { currency: string };
}

const ramps = Engine.context.RampsController as unknown as {
  state?: { autoramps: TestAutoramp[] };
  refreshAutoramp?: jest.Mock;
  createAutoramp?: jest.Mock;
  registerMoneyAccountWallet?: jest.Mock;
};
const engineContext = Engine.context as unknown as {
  NeoBankService?: { getDepositInstructions: jest.Mock };
};
const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const ACCOUNTS = [
  { currency: 'BRL', location: 'BR', region: 'BR' },
  { currency: 'USD', location: 'US', region: 'US' },
] as const;

type Account = (typeof ACCOUNTS)[number];

const autorampFor = (account: Account, status: string): TestAutoramp => ({
  id: `ar-${account.currency.toLowerCase()}`,
  walletAddress: VBA_TEST_MONEY_ADDRESS,
  status,
  depositRailsSummary: { currency: account.currency },
});

const renderAccount = (account: Account, storedStatus: string | null) => {
  const autoramps = storedStatus ? [autorampFor(account, storedStatus)] : [];
  ramps.state = { autoramps };
  return renderVbaDetails({
    location: account.location,
    overrides: {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
                enabled: true,
                minimumVersion: '0.0.0',
                regions: [account.region],
                regionCurrencies: { [account.region]: account.currency },
              },
            },
          },
          RampsController: { autoramps },
        },
      },
    } as unknown as DeepPartial<RootState>,
  });
};

const creatingTitle = () =>
  strings('virtual_bank_account.creating_account.title');

// Hydrate result for an approved customer with a registered wallet and no
// autoramp, which makes the details screen create one.
const NEEDS_SOURCE_CURRENCY = {
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'submitted',
  kycStatus: 'approved',
  autorampStatus: 'needs_source_currency',
};

const renderCreatingAccount = (account: Account) => {
  (
    Engine.context.RampsController as unknown as {
      hydrateVbaOnboarding: jest.Mock;
    }
  ).hydrateVbaOnboarding.mockResolvedValue(NEEDS_SOURCE_CURRENCY);
  return renderAccount(account, null);
};

describeForPlatforms('VbaDetails autoramp responses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
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

  describe.each(ACCOUNTS)('$currency account', (account) => {
    // MoonPay autoramp statuses before Approved (`AutorampStatus`).
    it.each(['Created', 'Authorized', 'EditPending', 'DepositAccountAdded'])(
      'shows the creating message while refresh returns %s',
      async (status) => {
        ramps.refreshAutoramp?.mockResolvedValue(autorampFor(account, status));
        const { findByText, queryByTestId } = renderAccount(account, 'Created');

        expect(await findByText(creatingTitle())).toBeOnTheScreen();
        expect(ramps.refreshAutoramp).toHaveBeenCalledWith(
          autorampFor(account, status).id,
        );
        expect(
          queryByTestId(VbaDetailsSelectorsIDs.CONTAINER),
        ).not.toBeOnTheScreen();
        expect(ramps.createAutoramp).not.toHaveBeenCalled();
      },
    );

    it.each(['Rejected', 'Cancelled'])(
      'opens the generic account error when refresh returns %s',
      async (status) => {
        ramps.refreshAutoramp?.mockResolvedValue(autorampFor(account, status));
        const { findByTestId } = renderAccount(account, 'Created');

        expect(
          await findByTestId(
            `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`,
          ),
        ).toBeOnTheScreen();
        expect(ramps.createAutoramp).not.toHaveBeenCalled();
      },
    );

    it.each(['AuthorizationFailed', 'RegistrationFailed'])(
      'opens the details account error when refresh returns %s',
      async (status) => {
        ramps.refreshAutoramp?.mockResolvedValue(autorampFor(account, status));
        const { findByTestId, queryByTestId } = renderAccount(
          account,
          'Created',
        );

        expect(
          await findByTestId(
            `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-details`,
          ),
        ).toBeOnTheScreen();
        expect(
          queryByTestId(
            `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`,
          ),
        ).not.toBeOnTheScreen();
      },
    );

    it('keeps the creating message when the autoramp refresh fails with a 500', async () => {
      ramps.refreshAutoramp?.mockRejectedValue(
        new HttpError(500, "Fetching '/neobank/autoramps/ar' failed"),
      );
      const { findByText, queryByTestId } = renderAccount(account, 'Created');

      expect(await findByText(creatingTitle())).toBeOnTheScreen();
      expect(
        queryByTestId(`${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(VbaDetailsSelectorsIDs.LOAD_ERROR),
      ).not.toBeOnTheScreen();
    });

    it('keeps loading details while the Approved autoramp has no deposit rail yet', async () => {
      const { findByTestId, queryByTestId } = renderAccount(
        account,
        'Approved',
      );

      expect(
        await findByTestId(VbaDetailsSelectorsIDs.LOADING),
      ).toBeOnTheScreen();
      expect(
        engineContext.NeoBankService?.getDepositInstructions,
      ).toHaveBeenCalledWith(autorampFor(account, 'Approved').id);
      expect(
        queryByTestId(VbaDetailsSelectorsIDs.LOAD_ERROR),
      ).not.toBeOnTheScreen();
    });

    it.each([
      [400, 'details'],
      [401, 'generic'],
      [403, 'details'],
      [404, 'generic'],
      [422, 'details'],
      [500, 'generic'],
    ])(
      'opens the account error when creating the account returns HTTP %d',
      async (httpStatus, variant) => {
        ramps.createAutoramp?.mockRejectedValue(
          new HttpError(httpStatus, "Fetching '/neobank/autoramps' failed"),
        );
        const { findByTestId } = renderCreatingAccount(account);

        expect(
          await findByTestId(
            `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-${variant}`,
          ),
        ).toBeOnTheScreen();
        expect(ramps.createAutoramp).toHaveBeenCalled();
      },
    );

    it('opens the generic account error when creating the account fails without a status', async () => {
      ramps.createAutoramp?.mockRejectedValue(
        new Error('Network request failed'),
      );
      const { findByTestId } = renderCreatingAccount(account);

      expect(
        await findByTestId(
          `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`,
        ),
      ).toBeOnTheScreen();
    });

    it('stays on the creating message when creating the account returns HTTP 409', async () => {
      ramps.createAutoramp?.mockRejectedValue(
        new HttpError(409, "Fetching '/neobank/autoramps' failed"),
      );
      const { findByText, queryByTestId } = renderCreatingAccount(account);

      expect(await findByText(creatingTitle())).toBeOnTheScreen();
      expect(ramps.createAutoramp).toHaveBeenCalled();
      expect(
        queryByTestId(`${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(`${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-details`),
      ).not.toBeOnTheScreen();
    });

    it.each(['AuthorizationFailed', 'RegistrationFailed'])(
      'opens the details account error when creating the account responds %s',
      async (status) => {
        ramps.createAutoramp?.mockResolvedValue(autorampFor(account, status));
        const { findByTestId } = renderCreatingAccount(account);

        expect(
          await findByTestId(
            `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-details`,
          ),
        ).toBeOnTheScreen();
      },
    );

    // Statuses the neobank proxy mirrors from MoonPay (NeoBankService).
    it.each([403, 404, 422, 429, 500])(
      'shows the deposit load error when deposit details return HTTP %d',
      async (httpStatus) => {
        engineContext.NeoBankService?.getDepositInstructions.mockRejectedValue(
          new HttpError(httpStatus, "Fetching '/neobank/autoramps/ar' failed"),
        );
        const { findByTestId, queryByTestId } = renderAccount(
          account,
          'Approved',
        );

        expect(
          await findByTestId(VbaDetailsSelectorsIDs.LOAD_ERROR),
        ).toHaveTextContent(
          strings('virtual_bank_account.vba_details.load_error'),
        );
        expect(
          queryByTestId(VbaDetailsSelectorsIDs.LOADING),
        ).not.toBeOnTheScreen();
      },
    );
  });
});
