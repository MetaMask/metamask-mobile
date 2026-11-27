import '../../../../../../tests/component-view/mocks';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { SolAccountType } from '@metamask/keyring-api';
import type { PaymentMethod } from '@metamask/ramps-controller';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { RootState } from '../../../../../reducers';
import type { PreferredToken } from '../../../../../selectors/featureFlagController/confirmations';
import { selectAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import { selectMoneyDepositAssetsMeetingMinimumBalance } from '../../selectors/depositTokens';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import { analytics } from '../../../../../util/analytics/analytics';
import { MUSD_TOKEN_ADDRESS } from '../../../Earn/constants/musd';
import {
  COMPONENT_NAMES,
  REDIRECT_TARGETS_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { MONAD_VAULT } from '../../../../../../tests/component-view/presets/moneyAccount';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
} from '../../../../../../tests/component-view/render';
import {
  MONEY_MOVEMENT_NEOBANK_BRL_FLAG_KEY,
  MONEY_MOVEMENT_NEOBANK_USD_FLAG_KEY,
} from '../../../../../selectors/featureFlagController/moneyAccount';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  VBA_TEST_MONEY_ADDRESS,
  type VbaMarketsOption,
} from '../../../../../../tests/component-view/presets/vba';
import {
  renderVbaCardHomeEntry,
  renderVbaMoneyEntry,
  restoreVbaReduxServiceStore,
  VbaRendererTestIds,
} from '../../../../../../tests/component-view/renderers/vba';
import { CreateVirtualBankAccountSelectorsIDs } from '../../../Ramp/Views/VirtualBankAccount/CreateVirtualBankAccount.testIds';
import { resetMusdAutorampSetupGuard } from '../../../Ramp/Views/VirtualBankAccount/ensureMusdAutoramp';
import { VbaAccountCreateErrorSelectorsIDs } from '../../../Ramp/Views/VirtualBankAccount/VbaAccountCreateError';
import { VbaDetailsSelectorsIDs } from '../../../Ramp/Views/VirtualBankAccount/VbaDetails';
import { VbaOnboardingLoadingSelectorsIDs } from '../../../Ramp/Views/VirtualBankAccount/VbaOnboardingLoading';
import { VbaOnboardingStubSelectorsIDs } from '../../../Ramp/Views/VirtualBankAccount/VbaOnboardingStub';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const disclaimer = {
  id: 'vendor-terms',
  url: 'https://moonpay.example/terms',
  display_name: "MoonPay's Terms and Conditions",
};

const mockHydrateVbaOnboarding = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);
const mockFetchVendorDisclaimers = jest.mocked(
  Engine.context.KycController.fetchVendorDisclaimers,
);
const mockGetPaymentMethodsForContext = jest.mocked(
  Engine.context.RampsController.getPaymentMethodsForContext,
);

const rampsController = Engine.context.RampsController as unknown as {
  state?: unknown;
};
const engineContext = Engine.context as unknown as {
  NeoBankService?: { getDepositInstructions: jest.Mock };
};
const mockGetDepositInstructions = jest.fn();
let previousRampsState: unknown;

const pixInstructions = {
  type: 'Pix',
  brCode: '00020126',
  instruction: 'Pay with PIX',
  pixKey: 'pix@example.com',
};

const approvedAutoramp = {
  id: 'ar-1',
  walletAddress: VBA_TEST_MONEY_ADDRESS,
  status: 'Approved',
};

/**
 * An existing Money-address account while every per-currency flag is off.
 * The account must stay reachable even though `selectNeobankMarkets` is empty.
 */
const existingAccountWithNoCurrencyFlags = (): DeepPartial<RootState> =>
  ({
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            [MONEY_MOVEMENT_NEOBANK_BRL_FLAG_KEY]: {
              enabled: false,
              minimumVersion: '0.0.0',
            },
            [MONEY_MOVEMENT_NEOBANK_USD_FLAG_KEY]: {
              enabled: false,
              minimumVersion: '0.0.0',
            },
          },
        },
        RampsController: {
          autoramps: [approvedAutoramp],
        },
      },
    },
  }) as unknown as DeepPartial<RootState>;

const manualBankTransfer: PaymentMethod = {
  id: '/payments/bank-transfer',
  paymentType: 'bank-transfer',
  name: 'Bank transfer',
  score: 1,
  icon: 'bank',
  isManualBankTransfer: true,
  delay: [2880, 4320],
};

type BankAccountRowState = 'enabled' | 'coming-soon' | 'hidden';
type ArrivalCopy = 'pix' | 'business-days';

const ARRIVAL_TITLE: Record<ArrivalCopy, () => string> = {
  pix: () =>
    strings(
      'virtual_bank_account.create_virtual_bank_account.feature_arrives_title_pix',
    ),
  'business-days': () =>
    strings(
      'virtual_bank_account.create_virtual_bank_account.feature_arrives_title',
      { timeframe: '2 - 3 business days' },
    ),
};

interface GateRow {
  name: string;
  markets: VbaMarketsOption;
  location: 'BR' | 'US' | 'PT';
  expected: BankAccountRowState;
  arrival?: ArrivalCopy;
  legacyFlagEnabled?: boolean;
}

const BRL_ONLY: VbaMarketsOption = { brl: true, usd: false };
const USD_ONLY: VbaMarketsOption = { brl: false, usd: true };
const BOTH: VbaMarketsOption = { brl: true, usd: true };
const BOTH_OFF: VbaMarketsOption = { brl: false, usd: false };

const NEW_USER_GATE_ROWS: GateRow[] = [
  {
    name: 'BRL only',
    markets: BRL_ONLY,
    location: 'BR',
    expected: 'enabled',
    arrival: 'pix',
  },
  { name: 'BRL only', markets: BRL_ONLY, location: 'US', expected: 'hidden' },
  { name: 'BRL only', markets: BRL_ONLY, location: 'PT', expected: 'hidden' },
  { name: 'USD only', markets: USD_ONLY, location: 'BR', expected: 'hidden' },
  {
    name: 'USD only',
    markets: USD_ONLY,
    location: 'US',
    expected: 'enabled',
    arrival: 'business-days',
  },
  { name: 'USD only', markets: USD_ONLY, location: 'PT', expected: 'hidden' },
  {
    name: 'both',
    markets: BOTH,
    location: 'BR',
    expected: 'enabled',
    arrival: 'pix',
  },
  {
    name: 'both',
    markets: BOTH,
    location: 'US',
    expected: 'enabled',
    arrival: 'business-days',
  },
  { name: 'both', markets: BOTH, location: 'PT', expected: 'hidden' },
  {
    name: 'both off',
    markets: BOTH_OFF,
    location: 'BR',
    expected: 'coming-soon',
  },
  {
    name: 'both off',
    markets: BOTH_OFF,
    location: 'US',
    expected: 'coming-soon',
  },
  {
    name: 'both off',
    markets: BOTH_OFF,
    location: 'PT',
    expected: 'coming-soon',
  },
  {
    name: 'legacy flag off, BRL open',
    markets: BRL_ONLY,
    location: 'BR',
    expected: 'enabled',
    arrival: 'pix',
    legacyFlagEnabled: false,
  },
  {
    name: 'legacy flag on only',
    markets: BOTH_OFF,
    location: 'BR',
    expected: 'coming-soon',
    legacyFlagEnabled: true,
  },
];

const emptyOnboardingSnapshot = {
  sessionExists: false,
  vendorDisclaimersComplete: false,
  sessionDisclaimersComplete: false,
  providerFlowStatus: 'not_started',
  kycStatus: 'none',
  autorampStatus: 'not_ready',
} as const;

describeForPlatforms('MoneyAddMoneySheet VBA entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrateVbaOnboarding.mockReset();
    mockHydrateVbaOnboarding.mockResolvedValue(emptyOnboardingSnapshot);
    mockFetchVendorDisclaimers.mockResolvedValue([disclaimer]);
    mockGetDepositInstructions.mockReset();
    previousRampsState = rampsController.state;
    delete engineContext.NeoBankService;
  });

  afterEach(() => {
    rampsController.state = previousRampsState;
    delete engineContext.NeoBankService;
    restoreVbaReduxServiceStore();
    resetMusdAutorampSetupGuard();
    netInfoMock.__resetMockNetInfo();
  });

  it('opens loading before routing an eligible user to vendor terms', async () => {
    let resolveHydration:
      | ((snapshot: {
          sessionExists: false;
          vendorDisclaimersComplete: false;
          sessionDisclaimersComplete: false;
          providerFlowStatus: 'not_started';
          kycStatus: 'none';
          autorampStatus: 'not_ready';
        }) => void)
      | undefined;
    mockHydrateVbaOnboarding.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveHydration = resolve;
        }),
    );
    const { findByTestId, getByTestId } = renderVbaMoneyEntry();
    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );
    await waitFor(() => {
      expect(
        getByTestId(VbaOnboardingLoadingSelectorsIDs.SPINNER),
      ).toBeOnTheScreen();
    });

    await act(async () => {
      resolveHydration?.(emptyOnboardingSnapshot);
    });

    await waitFor(() => {
      expect(
        getByTestId(CreateVirtualBankAccountSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  it('shows the generic setup error when loading fails and retries into vendor terms', async () => {
    mockHydrateVbaOnboarding
      .mockRejectedValueOnce(new Error('hydrate failed'))
      .mockResolvedValue(emptyOnboardingSnapshot);
    const { findByTestId, queryByTestId, getByTestId } = renderVbaMoneyEntry();
    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );

    await waitFor(() => {
      expect(
        getByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
      ).toBeOnTheScreen();
    });
    expect(mockHydrateVbaOnboarding).toHaveBeenCalledTimes(1);

    fireEvent.press(
      await findByTestId(VbaOnboardingStubSelectorsIDs.CONTINUE_BUTTON),
    );

    await waitFor(() => {
      expect(
        getByTestId(CreateVirtualBankAccountSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
    expect(
      queryByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
    ).not.toBeOnTheScreen();
    expect(mockHydrateVbaOnboarding).toHaveBeenCalledTimes(2);
  });

  it('stays on the generic setup error when retry fails again', async () => {
    mockHydrateVbaOnboarding.mockRejectedValue(new Error('hydrate failed'));
    const { findByTestId, queryByTestId, getByTestId } = renderVbaMoneyEntry();
    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );
    await waitFor(() => {
      expect(
        getByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
      ).toBeOnTheScreen();
    });

    fireEvent.press(
      await findByTestId(VbaOnboardingStubSelectorsIDs.CONTINUE_BUTTON),
    );

    await waitFor(() => {
      expect(
        getByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
      ).toBeOnTheScreen();
    });
    expect(mockHydrateVbaOnboarding).toHaveBeenCalledTimes(2);
    expect(
      queryByTestId(CreateVirtualBankAccountSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('shows the generic setup error without loading when no wallet is selected', async () => {
    // Clear HD keyrings so selectPrimaryMoneyAccount / selectSelectedVbaWalletAddress
    // resolve to null (moneyAccounts alone is not enough after the Money-address fix).
    const { findByTestId, getByTestId } = renderVbaMoneyEntry({
      overrides: {
        engine: {
          backgroundState: {
            KeyringController: {
              keyrings: [],
            },
          },
        },
      },
    });
    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );

    await waitFor(() => {
      expect(
        getByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
      ).toBeOnTheScreen();
    });
    expect(mockHydrateVbaOnboarding).not.toHaveBeenCalled();
  });

  it('returns to the previous screen from the generic setup error', async () => {
    mockHydrateVbaOnboarding.mockRejectedValue(new Error('hydrate failed'));
    const { findByTestId, queryByTestId, getByTestId } = renderVbaMoneyEntry();
    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );
    await waitFor(() => {
      expect(
        getByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
      ).toBeOnTheScreen();
    });

    fireEvent.press(
      await findByTestId(VbaOnboardingStubSelectorsIDs.BACK_BUTTON),
    );

    await waitFor(() => {
      expect(
        getByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET),
      ).toBeOnTheScreen();
    });
    expect(
      queryByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
    ).not.toBeOnTheScreen();
  });

  it('returns to Money home from completed Pix details', async () => {
    const ramps = Engine.context.RampsController as { state?: unknown };
    const previousState = ramps.state;
    ramps.state = {
      autoramps: [
        {
          id: 'ar-1',
          // Must match selectSelectedVbaWalletAddress (Money account), not Account 1.
          walletAddress: VBA_TEST_MONEY_ADDRESS,
          status: 'Approved',
        },
      ],
    };
    mockHydrateVbaOnboarding.mockResolvedValue({
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'submitted',
      kycStatus: 'approved',
      autorampStatus: 'ready',
    });
    const { findByTestId, queryByTestId, getByTestId } = renderVbaMoneyEntry();
    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );
    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    });

    fireEvent.press(await findByTestId(VbaDetailsSelectorsIDs.BACK_BUTTON));

    await waitFor(() => {
      expect(
        getByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET),
      ).toBeOnTheScreen();
    });
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
    ramps.state = previousState;
  });

  it('shows the account setup error when creating the account fails', async () => {
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    mockHydrateVbaOnboarding
      .mockResolvedValueOnce({
        sessionExists: true,
        vendorDisclaimersComplete: true,
        sessionDisclaimersComplete: true,
        providerFlowStatus: 'submitted',
        kycStatus: 'approved',
        autorampStatus: 'ready',
      })
      .mockResolvedValue({
        sessionExists: true,
        vendorDisclaimersComplete: true,
        sessionDisclaimersComplete: true,
        providerFlowStatus: 'submitted',
        kycStatus: 'approved',
        autorampStatus: 'retryable_failure',
      });
    const { findByTestId, getByTestId } = renderVbaMoneyEntry();
    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );

    await waitFor(() => {
      expect(
        getByTestId(`${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`),
      ).toBeOnTheScreen();
    });

    fireEvent.press(
      await findByTestId(VbaAccountCreateErrorSelectorsIDs.PRIMARY_BUTTON),
    );

    await waitFor(() => {
      expect(mockHydrateVbaOnboarding).toHaveBeenCalledTimes(3);
    });
    await waitFor(() => {
      expect(
        getByTestId(`${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`),
      ).toBeOnTheScreen();
    });
  });

  it('shows the bank account entry only inside enabled regions', async () => {
    const eligible = renderVbaMoneyEntry({ location: 'BR' });
    fireEvent.press(
      await eligible.findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET),
    );
    await waitFor(() => {
      expect(
        eligible.getByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
      ).toBeOnTheScreen();
    });
    eligible.unmount();

    const ineligible = renderVbaMoneyEntry({ location: 'PT' });
    fireEvent.press(
      await ineligible.findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET),
    );
    await waitFor(() => {
      expect(
        ineligible.queryByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
      ).not.toBeOnTheScreen();
    });
  });

  it('keeps the Bank account row enabled for an existing account when every currency flag is off', async () => {
    rampsController.state = { autoramps: [approvedAutoramp] };

    const { findByTestId, queryByText, getByTestId } = renderVbaMoneyEntry({
      overrides: existingAccountWithNoCurrencyFlags(),
    });

    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    const bankAccountRow = await findByTestId(
      MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW,
    );

    expect(bankAccountRow).toBeEnabled();
    expect(
      queryByText(strings('money.add_money_sheet.coming_soon')),
    ).toBeNull();

    fireEvent.press(bankAccountRow);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    });
  });

  it('renders Pix details for an existing account when every currency flag is off', async () => {
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    rampsController.state = { autoramps: [approvedAutoramp] };
    engineContext.NeoBankService = {
      getDepositInstructions: mockGetDepositInstructions,
    };
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);

    const { findByTestId, getByText, getByTestId } = renderVbaMoneyEntry({
      overrides: existingAccountWithNoCurrencyFlags(),
    });

    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
    expect(
      getByText(strings('virtual_bank_account.vba_details.copia_cola_label')),
    ).toBeOnTheScreen();
    expect(getByText(pixInstructions.brCode)).toBeOnTheScreen();
    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_KEY)).toBeOnTheScreen();
    });
    expect(
      getByText(strings('virtual_bank_account.vba_details.pix_key_label')),
    ).toBeOnTheScreen();
    expect(getByText(pixInstructions.pixKey)).toBeOnTheScreen();
    expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-1');
  });

  describe('Bank account row gate matrix', () => {
    beforeEach(() => {
      mockGetPaymentMethodsForContext.mockReset();
      mockGetPaymentMethodsForContext.mockResolvedValue({
        methods: [manualBankTransfer],
        selected: null,
        providerIds: [],
      });
    });

    afterEach(() => {
      // Tests outside this block expect the shared empty payment methods.
      mockGetPaymentMethodsForContext.mockReset();
      mockGetPaymentMethodsForContext.mockResolvedValue({
        methods: [],
        selected: null,
        providerIds: [],
      });
    });

    const openSheet = async (
      view: ReturnType<typeof renderVbaMoneyEntry>,
    ): Promise<void> => {
      fireEvent.press(
        await view.findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET),
      );
      // Always rendered, so an absent Bank account row means hidden, not still opening.
      await view.findByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION);
    };

    const hiddenGateRows = NEW_USER_GATE_ROWS.filter(
      (row) => row.expected === 'hidden',
    );
    const comingSoonGateRows = NEW_USER_GATE_ROWS.filter(
      (row) => row.expected === 'coming-soon',
    );
    const enabledGateRows = NEW_USER_GATE_ROWS.filter(
      (row) => row.expected === 'enabled',
    );

    it.each(hiddenGateRows)(
      '$name, $location hides the Bank account row',
      async ({ markets, location, legacyFlagEnabled }) => {
        const view = renderVbaMoneyEntry({
          markets,
          location,
          legacyFlagEnabled,
        });
        await openSheet(view);

        expect(
          view.queryByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
        ).not.toBeOnTheScreen();
        expect(
          view.queryByText(strings('money.add_money_sheet.coming_soon')),
        ).not.toBeOnTheScreen();
      },
    );

    it.each(comingSoonGateRows)(
      '$name, $location keeps the Bank account row coming soon',
      async ({ markets, location, legacyFlagEnabled }) => {
        const view = renderVbaMoneyEntry({
          markets,
          location,
          legacyFlagEnabled,
        });
        await openSheet(view);

        const row = view.getByTestId(
          MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW,
        );
        expect(row).toBeDisabled();
        expect(
          view.getByText(strings('money.add_money_sheet.coming_soon')),
        ).toBeOnTheScreen();
        // Coming soon stays under Convert crypto when every currency flag is off.
        const optionTestIds = [
          MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
          MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW,
        ];
        const seen = new Set<string>();
        const order = view.UNSAFE_root.findAll((node) =>
          optionTestIds.includes(node.props.testID),
        )
          .map((node) => node.props.testID as string)
          .filter((id) => {
            if (seen.has(id)) {
              return false;
            }
            seen.add(id);
            return true;
          });
        expect(
          order.indexOf(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
        ).toBeGreaterThan(
          order.indexOf(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
        );

        fireEvent.press(row);

        expect(mockHydrateVbaOnboarding).not.toHaveBeenCalled();
      },
    );

    it.each(enabledGateRows)(
      '$name, $location opens vendor terms from the Bank account row',
      async ({ markets, location, arrival, legacyFlagEnabled }) => {
        const view = renderVbaMoneyEntry({
          markets,
          location,
          legacyFlagEnabled,
        });
        await openSheet(view);

        const row = view.getByTestId(
          MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW,
        );
        expect(row).toBeEnabled();
        expect(
          view.queryByText(strings('money.add_money_sheet.coming_soon')),
        ).not.toBeOnTheScreen();

        fireEvent.press(row);

        await waitFor(() => {
          expect(
            view.getByTestId(CreateVirtualBankAccountSelectorsIDs.CONTAINER),
          ).toBeOnTheScreen();
        });
        if (arrival) {
          await waitFor(() => {
            expect(view.getByText(ARRIVAL_TITLE[arrival]())).toBeOnTheScreen();
          });
        }
      },
    );

    it('hides the Bank account row while location is still loading and a currency flag is open', async () => {
      const view = renderVbaMoneyEntry({
        markets: BRL_ONLY,
        overrides: {
          engine: {
            backgroundState: {
              // Blank, not empty: an empty location blocks the whole sheet.
              GeolocationController: { location: ' ', status: 'loading' },
            },
          },
        } as unknown as DeepPartial<RootState>,
      });
      await openSheet(view);

      expect(
        view.queryByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
      ).not.toBeOnTheScreen();
    });
  });

  describe('from Card home', () => {
    it('returns to wallet home after backing out of bank details', async () => {
      const ramps = Engine.context.RampsController as { state?: unknown };
      const previousState = ramps.state;
      ramps.state = {
        autoramps: [
          {
            id: 'ar-1',
            // Must match selectSelectedVbaWalletAddress (Money account), not Account 1.
            walletAddress: VBA_TEST_MONEY_ADDRESS,
            status: 'Approved',
          },
        ],
      };
      mockHydrateVbaOnboarding.mockResolvedValue({
        sessionExists: true,
        vendorDisclaimersComplete: true,
        sessionDisclaimersComplete: true,
        providerFlowStatus: 'submitted',
        kycStatus: 'approved',
        autorampStatus: 'ready',
      });

      const { findByTestId, queryByTestId, getByTestId } =
        renderVbaCardHomeEntry();

      fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_CARD_HOME));
      fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
      fireEvent.press(
        await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
      );

      await waitFor(() => {
        expect(getByTestId(VbaDetailsSelectorsIDs.CONTAINER)).toBeOnTheScreen();
      });

      fireEvent.press(await findByTestId(VbaDetailsSelectorsIDs.BACK_BUTTON));

      await waitFor(() => {
        expect(
          getByTestId(VbaRendererTestIds.CARD_HOME_BACK),
        ).toBeOnTheScreen();
      });
      expect(
        queryByTestId(VbaDetailsSelectorsIDs.CONTAINER),
      ).not.toBeOnTheScreen();

      fireEvent.press(await findByTestId(VbaRendererTestIds.CARD_HOME_BACK));

      await waitFor(() => {
        expect(
          queryByTestId(VbaRendererTestIds.CARD_HOME_BACK),
        ).not.toBeOnTheScreen();
      });
      await waitFor(() => {
        expect(getByTestId(VbaRendererTestIds.WALLET_HOME)).toBeOnTheScreen();
      });
      ramps.state = previousState;
    });

    it('returns to wallet home after backing out of a failed bank setup', async () => {
      mockHydrateVbaOnboarding.mockRejectedValue(new Error('hydrate failed'));

      const { findByTestId, queryByTestId, getByTestId } =
        renderVbaCardHomeEntry();

      fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_CARD_HOME));
      fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
      fireEvent.press(
        await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
      );

      await waitFor(() => {
        expect(
          getByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
        ).toBeOnTheScreen();
      });

      fireEvent.press(
        await findByTestId(VbaOnboardingStubSelectorsIDs.BACK_BUTTON),
      );

      await waitFor(() => {
        expect(
          getByTestId(VbaRendererTestIds.CARD_HOME_BACK),
        ).toBeOnTheScreen();
      });
      expect(
        queryByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
      ).not.toBeOnTheScreen();

      fireEvent.press(await findByTestId(VbaRendererTestIds.CARD_HOME_BACK));

      await waitFor(() => {
        expect(
          queryByTestId(VbaRendererTestIds.CARD_HOME_BACK),
        ).not.toBeOnTheScreen();
      });
      await waitFor(() => {
        expect(getByTestId(VbaRendererTestIds.WALLET_HOME)).toBeOnTheScreen();
      });
    });
  });
});

const STABLECOIN_ACCOUNT_ID = 'acc-1';
const SOLANA_ACCOUNT_ID = 'acc-sol';
const SOLANA_USDC_ASSET_ID =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const BASE_USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const BASE_USDT = '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2';
const MAINNET_USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const MUSD = MUSD_TOKEN_ADDRESS;
const BASE_NATIVE_ASSET_ID = 'eip155:8453/slip44:60';
const MONAD_NATIVE_ASSET_ID = 'eip155:143/slip44:268435779';

interface StablecoinHolding {
  address: string;
  chainId: string;
  symbol: string;
  name: string;
  amount: string;
}

const holding = (
  address: string,
  chainId: string,
  symbol: string,
  name: string,
  amount: string,
): StablecoinHolding => ({ address, chainId, symbol, name, amount });

const SUPPORTED_STABLECOINS: PreferredToken[] = [
  { address: BASE_USDC, chainId: CHAIN_IDS.BASE, name: 'USDC', successRate: 1 },
  { address: BASE_USDT, chainId: CHAIN_IDS.BASE, name: 'USDT', successRate: 1 },
  { address: MUSD, chainId: CHAIN_IDS.MONAD, name: 'mUSD', successRate: 1 },
];

const LARGEST_STABLECOIN_ROWS: {
  symbol: 'USDC' | 'USDT' | 'mUSD';
  formattedBalance: string;
  holdings: StablecoinHolding[];
}[] = [
  {
    symbol: 'USDC',
    formattedBalance: '$100.00',
    holdings: [
      holding(BASE_USDC, CHAIN_IDS.BASE, 'USDC', 'USD Coin', '100'),
      holding(BASE_USDT, CHAIN_IDS.BASE, 'USDT', 'Tether USD', '50'),
      holding(MUSD, CHAIN_IDS.MONAD, 'mUSD', 'MetaMask USD', '25'),
    ],
  },
  {
    symbol: 'USDT',
    formattedBalance: '$75.00',
    holdings: [
      holding(BASE_USDC, CHAIN_IDS.BASE, 'USDC', 'USD Coin', '10'),
      holding(BASE_USDT, CHAIN_IDS.BASE, 'USDT', 'Tether USD', '75'),
      holding(MUSD, CHAIN_IDS.MONAD, 'mUSD', 'MetaMask USD', '25'),
    ],
  },
  {
    symbol: 'mUSD',
    formattedBalance: '$30.00',
    holdings: [
      holding(BASE_USDC, CHAIN_IDS.BASE, 'USDC', 'USD Coin', '10'),
      holding(BASE_USDT, CHAIN_IDS.BASE, 'USDT', 'Tether USD', '20'),
      holding(MUSD, CHAIN_IDS.MONAD, 'mUSD', 'MetaMask USD', '30'),
    ],
  },
];

const stablecoinAssetId = (asset: StablecoinHolding): string =>
  `eip155:${parseInt(asset.chainId, 16)}/erc20:${toChecksumHexAddress(
    asset.address,
  )}`;

/**
 * Real AssetsController balances plus the Pay tokens flag, so the row is driven
 * by the same balances -> selectors -> picker chain production uses.
 */
const stablecoinState = ({
  holdings,
  supportedTokens = SUPPORTED_STABLECOINS,
  solanaUsdcAmount,
}: {
  holdings: StablecoinHolding[];
  supportedTokens?: PreferredToken[];
  solanaUsdcAmount?: string;
}): DeepPartial<RootState> => {
  const assetsInfo: Record<string, unknown> = {
    [BASE_NATIVE_ASSET_ID]: {
      type: 'native',
      symbol: 'ETH',
      name: 'Ether',
      decimals: 18,
    },
    [MONAD_NATIVE_ASSET_ID]: {
      type: 'native',
      symbol: 'MON',
      name: 'Mon',
      decimals: 18,
    },
  };
  const assetsPrice: Record<string, unknown> = {
    [BASE_NATIVE_ASSET_ID]: {
      assetPriceType: 'fungible',
      price: 1,
      usdPrice: 1,
      lastUpdated: 0,
    },
    [MONAD_NATIVE_ASSET_ID]: {
      assetPriceType: 'fungible',
      price: 1,
      usdPrice: 1,
      lastUpdated: 0,
    },
  };
  const assetsBalanceByAccount: Record<
    string,
    Record<string, { amount: string }>
  > = { [STABLECOIN_ACCOUNT_ID]: {} };

  for (const asset of holdings) {
    const assetId = stablecoinAssetId(asset);
    assetsInfo[assetId] = {
      type: 'erc20',
      symbol: asset.symbol,
      name: asset.name,
      decimals: 6,
    };
    assetsBalanceByAccount[STABLECOIN_ACCOUNT_ID][assetId] = {
      amount: asset.amount,
    };
    assetsPrice[assetId] = {
      assetPriceType: 'fungible',
      id: asset.symbol.toLowerCase(),
      price: 1,
      usdPrice: 1,
      lastUpdated: 0,
    };
  }

  if (solanaUsdcAmount) {
    assetsInfo[SOLANA_USDC_ASSET_ID] = {
      type: 'spl',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    };
    assetsBalanceByAccount[SOLANA_ACCOUNT_ID] = {
      [SOLANA_USDC_ASSET_ID]: { amount: solanaUsdcAmount },
    };
    assetsPrice[SOLANA_USDC_ASSET_ID] = {
      assetPriceType: 'fungible',
      id: 'usd-coin',
      price: 1,
      usdPrice: 1,
      lastUpdated: 0,
    };
  }

  return {
    engine: {
      backgroundState: {
        AssetsController: {
          assetsInfo,
          assetsBalance: assetsBalanceByAccount,
          assetsPrice,
        },
        ...(solanaUsdcAmount
          ? {
              AccountsController: {
                internalAccounts: {
                  accounts: {
                    [SOLANA_ACCOUNT_ID]: {
                      id: SOLANA_ACCOUNT_ID,
                      address: '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T',
                      type: SolAccountType.DataAccount,
                      methods: [],
                      options: {},
                      scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
                      metadata: {
                        name: 'Solana Account',
                        importTime: 0,
                        keyring: { type: 'HD Key Tree' },
                      },
                    },
                  },
                },
              },
              AccountTreeController: {
                accountTree: {
                  wallets: {
                    'entropy:wallet1': {
                      groups: {
                        'entropy:wallet1/0': {
                          accounts: [STABLECOIN_ACCOUNT_ID, SOLANA_ACCOUNT_ID],
                        },
                      },
                    },
                  },
                },
              },
            }
          : {}),
        NetworkController: {
          networkConfigurationsByChainId: {
            [CHAIN_IDS.BASE]: {
              chainId: CHAIN_IDS.BASE,
              name: 'Base',
              nativeCurrency: 'ETH',
              rpcEndpoints: [
                {
                  networkClientId: 'base-mainnet',
                  url: 'https://mainnet.base.org',
                  type: 'custom',
                  name: 'Base RPC',
                },
              ],
              defaultRpcEndpointIndex: 0,
              blockExplorerUrls: [],
              defaultBlockExplorerUrlIndex: 0,
            },
            [CHAIN_IDS.MONAD]: {
              chainId: CHAIN_IDS.MONAD,
              name: 'Monad',
              nativeCurrency: 'MON',
              rpcEndpoints: [
                {
                  networkClientId: 'monad-mainnet',
                  url: 'https://rpc.monad.xyz',
                  type: 'custom',
                  name: 'Monad RPC',
                },
              ],
              defaultRpcEndpointIndex: 0,
              blockExplorerUrls: [],
              defaultBlockExplorerUrlIndex: 0,
            },
          },
        },
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            moneyAccountVaultConfig: MONAD_VAULT,
            confirmations_pay_tokens: {
              preferredTokens: {
                default: [],
                overrides: {
                  [TransactionType.moneyAccountDeposit]: supportedTokens,
                },
              },
            },
          },
        },
      },
    },
  } as unknown as DeepPartial<RootState>;
};

describeForPlatforms('MoneyAddMoneySheet stablecoin quick deposit', () => {
  let trackEventSpy: jest.SpyInstance;
  let findNetworkClientIdSpy: jest.SpyInstance;

  const renderSheet = (
    holdings: StablecoinHolding[],
    options: {
      supportedTokens?: PreferredToken[];
      solanaUsdcAmount?: string;
    } = {},
  ) =>
    renderVbaMoneyEntry({
      overrides: stablecoinState({ holdings, ...options }),
      extraRoutes: [
        {
          name: Routes.MONEY.CONFIRMATIONS_ROOT,
          Component: createRouteParamsProbe(Routes.MONEY.CONFIRMATIONS_ROOT),
        },
      ],
    });

  const openSheet = async (view: ReturnType<typeof renderSheet>) => {
    fireEvent.press(
      await view.findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET),
    );
    await view.findByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION);
  };

  beforeEach(() => {
    trackEventSpy = jest.spyOn(analytics, 'trackEvent');
    findNetworkClientIdSpy = jest
      .spyOn(Engine.context.NetworkController, 'findNetworkClientIdByChainId')
      .mockReturnValue('monad-mainnet');
  });

  afterEach(() => {
    trackEventSpy.mockRestore();
    findNetworkClientIdSpy.mockRestore();
    restoreVbaReduxServiceStore();
  });

  it.each(LARGEST_STABLECOIN_ROWS)(
    'shows the largest stablecoin ($symbol) with its formatted balance',
    async ({ holdings, symbol, formattedBalance }) => {
      const view = renderSheet(holdings);

      await openSheet(view);

      const row = view.getByTestId(
        MoneyAddMoneySheetTestIds.MOVE_STABLECOIN_OPTION,
      );
      expect(row).toBeOnTheScreen();
      expect(within(row).getByText(formattedBalance)).toBeOnTheScreen();
      expect(within(row).getByText(symbol)).toBeOnTheScreen();
    },
  );

  it('hides the stablecoin row when the only stablecoin sits on a chain missing from moneyAccountDeposit', async () => {
    const view = renderSheet([
      holding(MAINNET_USDC, CHAIN_IDS.MAINNET, 'USDC', 'USD Coin', '250'),
    ]);

    await openSheet(view);

    // The balance qualifies, so only the missing Pay-token entry hides it.
    expect(
      selectMoneyDepositAssetsMeetingMinimumBalance(
        view.store.getState() as RootState,
      ).map((asset) => asset.address),
    ).toContain(toChecksumHexAddress(MAINNET_USDC));
    expect(
      view.queryByTestId(MoneyAddMoneySheetTestIds.MOVE_STABLECOIN_OPTION),
    ).not.toBeOnTheScreen();
  });

  it('hides the stablecoin row when the only stablecoin is USDC on Solana', async () => {
    const view = renderSheet([], { solanaUsdcAmount: '250' });

    await openSheet(view);

    // The balance is in the wallet, so only the EVM-only deposit gate hides it.
    expect(
      Object.values(
        selectAssetsBySelectedAccountGroup(view.store.getState() as RootState),
      )
        .flat()
        .map((asset) => asset.assetId),
    ).toContain(SOLANA_USDC_ASSET_ID);
    expect(
      view.queryByTestId(MoneyAddMoneySheetTestIds.MOVE_STABLECOIN_OPTION),
    ).not.toBeOnTheScreen();
  });

  it('hides the stablecoin row and disables Convert crypto when the only balance is below the minimum', async () => {
    const view = renderSheet([
      holding(BASE_USDC, CHAIN_IDS.BASE, 'USDC', 'USD Coin', '0.005'),
    ]);

    await openSheet(view);

    expect(
      view.queryByTestId(MoneyAddMoneySheetTestIds.MOVE_STABLECOIN_OPTION),
    ).not.toBeOnTheScreen();
    const convertCryptoRow = view.getByTestId(
      MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
    );
    expect(convertCryptoRow).toBeDisabled();

    fireEvent.press(convertCryptoRow);

    expect(
      view.queryByTestId(
        getRouteParamsProbeTestId(Routes.MONEY.CONFIRMATIONS_ROOT),
      ),
    ).not.toBeOnTheScreen();
  });

  it('starts the deposit with the largest stablecoin and tracks the row press', async () => {
    const view = renderSheet(LARGEST_STABLECOIN_ROWS[0].holdings);

    await openSheet(view);

    fireEvent.press(
      view.getByTestId(MoneyAddMoneySheetTestIds.MOVE_STABLECOIN_OPTION),
    );

    const paramsElement = await view.findByTestId(
      getRouteParamsProbeTestId(Routes.MONEY.CONFIRMATIONS_ROOT),
    );
    expect(JSON.parse(String(paramsElement.props.children))).toEqual({
      screen: Routes.FULL_SCREEN_CONFIRMATIONS.CONFIRMATIONS,
      params: expect.objectContaining({
        depositIntent: 'addUsdc',
        preferredPaymentToken: {
          // The row uses the checksummed asset address from the token list.
          address: toChecksumHexAddress(BASE_USDC),
          chainId: CHAIN_IDS.BASE,
        },
      }),
    });

    const [quickDepositEvent] = trackEventSpy.mock.calls
      .map(
        ([event]) =>
          event as { name?: string; properties?: Record<string, unknown> },
      )
      .filter(
        (event) =>
          event.name === MetaMetricsEvents.MONEY_SURFACE_CLICKED.category &&
          event.properties?.component_name ===
            COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_MOVE_STABLECOIN,
      );

    expect(quickDepositEvent?.properties).toEqual(
      expect.objectContaining({
        component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_MOVE_STABLECOIN,
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
        redirect_target_type: REDIRECT_TARGETS_TYPES.SCREEN,
        token_symbol: 'USDC',
        token_position_in_list: 1,
        token_chain_id: CHAIN_IDS.BASE,
        tokens_in_list: 1,
        token_has_balance: true,
      }),
    );
  });
});
