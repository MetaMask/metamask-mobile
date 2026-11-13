import '../../../../../../tests/component-view/mocks';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import type { PaymentMethod } from '@metamask/ramps-controller';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import type { RootState } from '../../../../../reducers';
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
    const { findByTestId } = renderVbaMoneyEntry();
    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );
    expect(
      await findByTestId(VbaOnboardingLoadingSelectorsIDs.SPINNER),
    ).toBeOnTheScreen();

    await act(async () => {
      resolveHydration?.(emptyOnboardingSnapshot);
    });

    expect(
      await findByTestId(CreateVirtualBankAccountSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('shows the generic setup error when loading fails and retries into vendor terms', async () => {
    mockHydrateVbaOnboarding
      .mockRejectedValueOnce(new Error('hydrate failed'))
      .mockResolvedValue(emptyOnboardingSnapshot);
    const { findByTestId, queryByTestId } = renderVbaMoneyEntry();
    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );

    expect(
      await findByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
    ).toBeOnTheScreen();
    expect(mockHydrateVbaOnboarding).toHaveBeenCalledTimes(1);

    fireEvent.press(
      await findByTestId(VbaOnboardingStubSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(
      await findByTestId(CreateVirtualBankAccountSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
    ).not.toBeOnTheScreen();
    expect(mockHydrateVbaOnboarding).toHaveBeenCalledTimes(2);
  });

  it('stays on the generic setup error when retry fails again', async () => {
    mockHydrateVbaOnboarding.mockRejectedValue(new Error('hydrate failed'));
    const { findByTestId, queryByTestId } = renderVbaMoneyEntry();
    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );
    expect(
      await findByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
    ).toBeOnTheScreen();

    fireEvent.press(
      await findByTestId(VbaOnboardingStubSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(
      await findByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
    ).toBeOnTheScreen();
    expect(mockHydrateVbaOnboarding).toHaveBeenCalledTimes(2);
    expect(
      queryByTestId(CreateVirtualBankAccountSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('shows the generic setup error without loading when no wallet is selected', async () => {
    // Clear HD keyrings so selectPrimaryMoneyAccount / selectSelectedVbaWalletAddress
    // resolve to null (moneyAccounts alone is not enough after the Money-address fix).
    const { findByTestId } = renderVbaMoneyEntry({
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

    expect(
      await findByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
    ).toBeOnTheScreen();
    expect(mockHydrateVbaOnboarding).not.toHaveBeenCalled();
  });

  it('returns to the previous screen from the generic setup error', async () => {
    mockHydrateVbaOnboarding.mockRejectedValue(new Error('hydrate failed'));
    const { findByTestId, queryByTestId } = renderVbaMoneyEntry();
    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );
    expect(
      await findByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
    ).toBeOnTheScreen();

    fireEvent.press(
      await findByTestId(VbaOnboardingStubSelectorsIDs.BACK_BUTTON),
    );

    expect(
      await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET),
    ).toBeOnTheScreen();
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
    const { findByTestId, queryByTestId } = renderVbaMoneyEntry();
    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );
    expect(
      await findByTestId(VbaDetailsSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();

    fireEvent.press(await findByTestId(VbaDetailsSelectorsIDs.BACK_BUTTON));

    expect(
      await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET),
    ).toBeOnTheScreen();
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
    const { findByTestId } = renderVbaMoneyEntry();
    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );

    expect(
      await findByTestId(
        `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`,
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      await findByTestId(VbaAccountCreateErrorSelectorsIDs.PRIMARY_BUTTON),
    );

    await waitFor(() => {
      expect(mockHydrateVbaOnboarding).toHaveBeenCalledTimes(3);
    });
    expect(
      await findByTestId(
        `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`,
      ),
    ).toBeOnTheScreen();
  });

  it('shows the bank account entry only inside enabled regions', async () => {
    const eligible = renderVbaMoneyEntry({ location: 'BR' });
    fireEvent.press(
      await eligible.findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET),
    );
    expect(
      await eligible.findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    ).toBeOnTheScreen();
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

    const { findByTestId, queryByText } = renderVbaMoneyEntry({
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

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders Pix details for an existing account when every currency flag is off', async () => {
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    rampsController.state = { autoramps: [approvedAutoramp] };
    engineContext.NeoBankService = {
      getDepositInstructions: mockGetDepositInstructions,
    };
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);

    const { findByTestId, getByText } = renderVbaMoneyEntry({
      overrides: existingAccountWithNoCurrencyFlags(),
    });

    fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
    fireEvent.press(
      await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.PIX_CODE),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.vba_details.copia_cola_label')),
    ).toBeOnTheScreen();
    expect(getByText(pixInstructions.brCode)).toBeOnTheScreen();
    expect(
      await findByTestId(VbaDetailsSelectorsIDs.PIX_KEY),
    ).toBeOnTheScreen();
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

    const openSheet = async (
      view: ReturnType<typeof renderVbaMoneyEntry>,
    ): Promise<void> => {
      fireEvent.press(
        await view.findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET),
      );
      // Always rendered, so an absent Bank account row means hidden, not still opening.
      await view.findByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION);
    };

    it.each(NEW_USER_GATE_ROWS)(
      '$name, $location: Bank account row is $expected',
      async ({ markets, location, expected, arrival, legacyFlagEnabled }) => {
        const view = renderVbaMoneyEntry({
          markets,
          location,
          legacyFlagEnabled,
        });
        await openSheet(view);

        if (expected === 'hidden') {
          expect(
            view.queryByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
          ).not.toBeOnTheScreen();
          expect(
            view.queryByText(strings('money.add_money_sheet.coming_soon')),
          ).toBeNull();
          return;
        }

        const row = view.getByTestId(
          MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW,
        );
        if (expected === 'coming-soon') {
          expect(row).toBeDisabled();
          expect(
            view.getByText(strings('money.add_money_sheet.coming_soon')),
          ).toBeOnTheScreen();
          fireEvent.press(row);
          expect(mockHydrateVbaOnboarding).not.toHaveBeenCalled();
          return;
        }

        expect(row).toBeEnabled();
        expect(
          view.queryByText(strings('money.add_money_sheet.coming_soon')),
        ).toBeNull();

        fireEvent.press(row);

        expect(
          await view.findByTestId(
            CreateVirtualBankAccountSelectorsIDs.CONTAINER,
          ),
        ).toBeOnTheScreen();
        if (arrival) {
          expect(
            await view.findByText(ARRIVAL_TITLE[arrival]()),
          ).toBeOnTheScreen();
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

      const { findByTestId, queryByTestId } = renderVbaCardHomeEntry();

      fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_CARD_HOME));
      fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
      fireEvent.press(
        await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
      );

      expect(
        await findByTestId(VbaDetailsSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();

      fireEvent.press(await findByTestId(VbaDetailsSelectorsIDs.BACK_BUTTON));

      expect(
        await findByTestId(VbaRendererTestIds.CARD_HOME_BACK),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(VbaDetailsSelectorsIDs.CONTAINER),
      ).not.toBeOnTheScreen();

      fireEvent.press(await findByTestId(VbaRendererTestIds.CARD_HOME_BACK));

      await waitFor(() => {
        expect(
          queryByTestId(VbaRendererTestIds.CARD_HOME_BACK),
        ).not.toBeOnTheScreen();
      });
      expect(
        await findByTestId(VbaRendererTestIds.WALLET_HOME),
      ).toBeOnTheScreen();
      ramps.state = previousState;
    });

    it('returns to wallet home after backing out of a failed bank setup', async () => {
      mockHydrateVbaOnboarding.mockRejectedValue(new Error('hydrate failed'));

      const { findByTestId, queryByTestId } = renderVbaCardHomeEntry();

      fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_CARD_HOME));
      fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
      fireEvent.press(
        await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
      );

      expect(
        await findByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
      ).toBeOnTheScreen();

      fireEvent.press(
        await findByTestId(VbaOnboardingStubSelectorsIDs.BACK_BUTTON),
      );

      expect(
        await findByTestId(VbaRendererTestIds.CARD_HOME_BACK),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
      ).not.toBeOnTheScreen();

      fireEvent.press(await findByTestId(VbaRendererTestIds.CARD_HOME_BACK));

      await waitFor(() => {
        expect(
          queryByTestId(VbaRendererTestIds.CARD_HOME_BACK),
        ).not.toBeOnTheScreen();
      });
      expect(
        await findByTestId(VbaRendererTestIds.WALLET_HOME),
      ).toBeOnTheScreen();
    });
  });
});
