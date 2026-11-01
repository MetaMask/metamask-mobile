import '../../../../../../tests/component-view/mocks';
import { fireEvent, within } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import Engine from '../../../../../core/Engine';
import { MONEY_MOVEMENT_NEOBANK_FLAG_KEY } from '../../../../../selectors/featureFlagController/moneyAccount';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { VBA_TEST_MONEY_ADDRESS } from '../../../../../../tests/component-view/presets/vba';
import {
  renderVbaMoneyEntry,
  renderVbaMoneyHome,
  restoreVbaReduxServiceStore,
  VbaRendererTestIds,
} from '../../../../../../tests/component-view/renderers/vba';
import {
  clearAccountsTransactionsApiMocks,
  setupV1AccountTransactionsApiMock,
} from '../../../../../../tests/component-view/api-mocking/accounts-transactions';
import { VbaDetailsSelectorsIDs } from '../../../Ramp/Views/VirtualBankAccount/VbaDetails';
import { clearCachedDepositInstructions } from '../../../Ramp/Views/VirtualBankAccount/vbaDepositInstructionsCache';
import { resetMusdAutorampSetupGuard } from '../../../Ramp/Views/VirtualBankAccount/ensureMusdAutoramp';
import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  type VbaOnboardingSnapshot,
} from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import { VbaIdentityVerifiedSelectorsIDs } from '../../../KYC/Views/Status/IdentityVerified';
import { MoneyActionButtonRowTestIds } from '../../components/MoneyActionButtonRow/MoneyActionButtonRow.testIds';
import { MoneyAddMoneySheetTestIds } from '../../components/MoneyAddMoneySheet/MoneyAddMoneySheet.testIds';
import { strings } from '../../../../../../locales/i18n';

const USD_AUTORAMP_ID = 'ar-usd';
const US_BANK = {
  type: 'UsBank' as const,
  rail: 'ACH' as const,
  accountHolder: 'Jane Doe',
  routingNumber: '021000021',
  accountNumber: '123456789',
  bankName: 'Lead Bank',
};

interface TestAutoramp {
  id: string;
  walletAddress: string;
  status: string;
  depositRailsSummary?: { currency?: string; ready: boolean };
}

const usdAutoramp: TestAutoramp = {
  id: USD_AUTORAMP_ID,
  walletAddress: VBA_TEST_MONEY_ADDRESS,
  status: 'Approved',
  depositRailsSummary: { currency: 'USD', ready: true },
};

const approvedSnapshot = (
  autorampStatus: VbaOnboardingSnapshot['autorampStatus'],
) => ({
  ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'submitted' as const,
  kycStatus: 'approved' as const,
  autorampStatus,
});

const usdRegionOverrides = (
  location: 'US' | 'US-CA',
  autoramps: TestAutoramp[] = [usdAutoramp],
) =>
  ({
    user: {
      onboardingStepperProgress: {
        'money-home-onboarding-stepper': 2,
      },
    },
    engine: {
      backgroundState: {
        GeolocationController: {
          location,
          status: 'complete',
        },
        PreferencesController: {
          tokenSortConfig: {
            key: 'tokenFiatAmount',
            order: 'dsc',
            sortCallback: 'stringNumeric',
          },
        },
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
              enabled: true,
              minimumVersion: '0.0.0',
              regions: ['US'],
              regionCurrencies: { US: 'USD' },
            },
            moneyVbaPendingActivityEnabled: {
              enabled: false,
              minimumVersion: '0.0.0',
            },
            moneyVbaCompletedActivityEnabled: {
              enabled: false,
              minimumVersion: '0.0.0',
            },
          },
        },
        RampsController: {
          autoramps,
        },
      },
    },
  }) as unknown as DeepPartial<RootState>;

const ramps = Engine.context.RampsController as unknown as {
  state?: { autoramps: TestAutoramp[] };
  hydrateVbaOnboarding: jest.Mock;
  createAutoramp?: jest.Mock;
};
const engineContext = Engine.context as unknown as {
  NeoBankService?: { getDepositInstructions: jest.Mock };
};
const kycController = Engine.context.KycController as {
  state?: { sessionStatus: null };
};
const engineCall = Engine.controllerMessenger.call as jest.Mock;
const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const installMoneyHomeServices = () => {
  const previous = engineCall.getMockImplementation();
  engineCall.mockImplementation((action: string, ...args: unknown[]) => {
    if (action === 'MoneyAccountBalanceService:fetchBalanceWithFallback') {
      return Promise.resolve({
        musdBalance: '0',
        vmusdValueInMusd: '0',
        totalBalance: '0',
        source: 'api',
        usedFallback: false,
      });
    }
    if (action === 'MoneyAccountBalanceService:getExchangeRate') {
      return Promise.resolve({ rate: '1' });
    }
    if (action === 'MoneyAccountApiDataService:fetchInterest') {
      return Promise.resolve({ interest_earned_usd: '0' });
    }
    if (action === 'MoneyAccountApiDataService:fetchVbaTransfers') {
      return Promise.resolve({ transfers: [] });
    }
    if (action === 'MoneyAccountBalanceService:getVaultApy') {
      return Promise.resolve({ apy: '0.042' });
    }
    if (previous) {
      return previous(action, ...args);
    }
    return Promise.resolve(undefined);
  });
  return () => {
    engineCall.mockImplementation(
      previous ?? (() => Promise.resolve(undefined)),
    );
  };
};

describeForPlatforms('US VBA entry points', () => {
  let restoreEngine: (() => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    setupV1AccountTransactionsApiMock();
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    kycController.state = { sessionStatus: null };
    ramps.state = { autoramps: [usdAutoramp] };
    ramps.hydrateVbaOnboarding.mockResolvedValue(approvedSnapshot('ready'));
    engineContext.NeoBankService = {
      getDepositInstructions: jest.fn().mockResolvedValue(US_BANK),
    };
    restoreEngine = installMoneyHomeServices();
  });

  afterEach(() => {
    restoreEngine?.();
    restoreEngine = undefined;
    restoreVbaReduxServiceStore();
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    delete ramps.createAutoramp;
    clearAccountsTransactionsApiMocks();
    netInfoMock.__resetMockNetInfo();
    delete engineContext.NeoBankService;
    ramps.state = { autoramps: [] };
    kycController.state = { sessionStatus: null };
  });

  it('opens USD bank details from the Money home details button', async () => {
    const { findByTestId, getByTestId } = renderVbaMoneyHome({
      location: 'US',
      overrides: usdRegionOverrides('US'),
    });

    fireEvent.press(
      await findByTestId(MoneyActionButtonRowTestIds.DETAILS_BUTTON),
    );

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.ACCOUNT_HOLDER),
    ).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).toHaveTextContent(
      strings('virtual_bank_account.vba_details.bank_transfer_title'),
    );
    expect(
      within(getByTestId(VbaDetailsSelectorsIDs.ROUTING_NUMBER)).getByText(
        US_BANK.routingNumber,
      ),
    ).toBeOnTheScreen();
    expect(
      engineContext.NeoBankService?.getDepositInstructions,
    ).toHaveBeenCalledWith(USD_AUTORAMP_ID);
    expect(ramps.hydrateVbaOnboarding).toHaveBeenCalledWith({
      walletAddress: expect.stringMatching(
        new RegExp(`^${VBA_TEST_MONEY_ADDRESS}$`, 'i'),
      ),
      refreshKyc: true,
      refreshAutoramps: true,
    });
  });

  it('opens USD bank details from Add money for a US state geolocation', async () => {
    const { findByTestId, getByTestId } = renderVbaMoneyEntry({
      location: 'US-CA',
      overrides: usdRegionOverrides('US-CA'),
    });

    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.ACCOUNT_NUMBER),
    ).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).toHaveTextContent(
      strings('virtual_bank_account.vba_details.bank_transfer_title'),
    );
    expect(
      within(getByTestId(VbaDetailsSelectorsIDs.BANK_NAME)).getByText(
        US_BANK.bankName,
      ),
    ).toBeOnTheScreen();
    expect(
      engineContext.NeoBankService?.getDepositInstructions,
    ).toHaveBeenCalledWith(USD_AUTORAMP_ID);
  });

  it('creates a USD account from Add money for a US state geolocation with no account yet', async () => {
    ramps.state = { autoramps: [] };
    ramps.hydrateVbaOnboarding.mockResolvedValue(
      approvedSnapshot('needs_source_currency'),
    );
    ramps.createAutoramp = jest.fn(
      async (request: { recipient_account: { address: string } }) => {
        const created: TestAutoramp = {
          ...usdAutoramp,
          walletAddress: request.recipient_account.address,
        };
        ramps.state = { autoramps: [created] };
        return created;
      },
    );
    const { findByTestId, getByTestId } = renderVbaMoneyEntry({
      location: 'US-CA',
      overrides: usdRegionOverrides('US-CA', []),
    });

    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );
    fireEvent.press(
      await findByTestId(VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.ROUTING_NUMBER),
    ).toBeOnTheScreen();
    expect(ramps.createAutoramp).toHaveBeenCalledTimes(1);
    expect(ramps.createAutoramp).toHaveBeenCalledWith(
      expect.objectContaining({
        source_currencies: [{ type: 'Fiat', code: 'USD' }],
      }),
    );
    expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).toHaveTextContent(
      strings('virtual_bank_account.vba_details.bank_transfer_title'),
    );
    expect(
      engineContext.NeoBankService?.getDepositInstructions,
    ).toHaveBeenCalledWith(USD_AUTORAMP_ID);
  });
});
