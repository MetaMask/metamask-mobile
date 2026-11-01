import '../../../../../../tests/component-view/mocks';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import {
  WalletRegistrationError,
  type SelfHostedRegistration,
} from '@metamask/ramps-controller';
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
  hydrateVbaOnboarding: jest.Mock;
  registerMoneyAccountWallet?: jest.Mock;
  createAutoramp?: jest.Mock;
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

// `SelfHostedRegistration` (`wallet-registration-service.d.ts`).
const registration = (disabled: boolean): SelfHostedRegistration => ({
  id: 'reg-1',
  address: VBA_TEST_MONEY_ADDRESS,
  blockchain: 'Monad',
  disabled,
  isSelf: true,
});

const approvedAutoramp = (account: Account): TestAutoramp => ({
  id: `ar-${account.currency.toLowerCase()}`,
  walletAddress: VBA_TEST_MONEY_ADDRESS,
  status: 'Approved',
  depositRailsSummary: { currency: account.currency },
});

const pixInstructions = {
  type: 'Pix' as const,
  pixKey: 'maria@pix.br',
  brCode: '00020126580014br.gov.bcb.pix',
};

const usBankInstructions = {
  type: 'UsBank' as const,
  rail: 'ACH' as const,
  accountHolder: 'Jane Doe',
  routingNumber: '021000021',
  accountNumber: '123456789',
  bankName: 'Lead Bank',
};

// Hydrate result that sends account setup through wallet registration.
const NEEDS_WALLET_REGISTRATION = {
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'submitted' as const,
  kycStatus: 'approved' as const,
  autorampStatus: 'needs_wallet_registration' as const,
};

const detailTestId = (account: Account) =>
  account.currency === 'BRL'
    ? VbaDetailsSelectorsIDs.PIX_CODE
    : VbaDetailsSelectorsIDs.ACCOUNT_HOLDER;

describeForPlatforms('VbaDetails wallet registration responses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    ramps.state = { autoramps: [] };
    ramps.hydrateVbaOnboarding.mockResolvedValue(NEEDS_WALLET_REGISTRATION);
    ramps.registerMoneyAccountWallet = jest.fn();
    ramps.createAutoramp = jest.fn();
    engineContext.NeoBankService = {
      getDepositInstructions: jest.fn(async (autorampId: string) =>
        autorampId.endsWith('usd') ? usBankInstructions : pixInstructions,
      ),
    };
  });

  afterEach(() => {
    restoreVbaReduxServiceStore();
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    netInfoMock.__resetMockNetInfo();
    delete engineContext.NeoBankService;
    delete ramps.registerMoneyAccountWallet;
    delete ramps.createAutoramp;
    ramps.state = { autoramps: [] };
  });

  const renderAccount = (account: Account) =>
    renderVbaDetails({
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
            RampsController: { autoramps: [] },
          },
        },
      } as unknown as DeepPartial<RootState>,
    });

  describe.each(ACCOUNTS)('$currency account', (account) => {
    it.each<
      [
        'registered' | 'alreadyRegistered' | 'registeredDisabled',
        SelfHostedRegistration,
      ]
    >([
      ['registered', registration(false)],
      ['alreadyRegistered', registration(false)],
      ['registeredDisabled', registration(true)],
    ])(
      'shows the bank details when wallet registration returns %s',
      async (type, registered) => {
        ramps.registerMoneyAccountWallet?.mockResolvedValue({
          type,
          registration: registered,
        });
        ramps.createAutoramp?.mockImplementation(async () => {
          ramps.state = { autoramps: [approvedAutoramp(account)] };
          return { id: approvedAutoramp(account).id, status: 'Created' };
        });
        const { findByTestId } = renderAccount(account);

        expect(await findByTestId(detailTestId(account))).toBeOnTheScreen();
        expect(ramps.registerMoneyAccountWallet).toHaveBeenCalledWith({
          address: expect.stringMatching(
            new RegExp(`^${VBA_TEST_MONEY_ADDRESS}$`, 'i'),
          ),
        });
        expect(ramps.createAutoramp).toHaveBeenCalled();
      },
    );

    it('shows the generic account error when the wallet lookup is unavailable', async () => {
      // Transport failure: no HTTP status (`wallet-registration-service.js`).
      ramps.registerMoneyAccountWallet?.mockResolvedValue({
        type: 'lookupUnavailable',
        error: new WalletRegistrationError('lookupUnavailable', {
          message: 'self-hosted address lookup failed',
        }),
      });
      const { findByTestId, findByText, queryByTestId } =
        renderAccount(account);

      expect(
        await findByTestId(
          `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`,
        ),
      ).toBeOnTheScreen();
      expect(
        await findByText(
          strings('virtual_bank_account.account_create_error.generic.title'),
        ),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(VbaDetailsSelectorsIDs.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(ramps.createAutoramp).not.toHaveBeenCalled();
    });
  });
});
