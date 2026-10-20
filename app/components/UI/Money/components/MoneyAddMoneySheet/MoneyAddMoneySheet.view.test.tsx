import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  renderVbaMoneyEntry,
  restoreVbaReduxServiceStore,
  VbaRendererTestIds,
} from '../../../../../../tests/component-view/renderers/vba';
import { CreateVirtualBankAccountSelectorsIDs } from '../../../Ramp/Views/VirtualBankAccount/CreateVirtualBankAccount.testIds';
import { VbaOnboardingLoadingSelectorsIDs } from '../../../Ramp/Views/VirtualBankAccount/VbaOnboardingLoading';
import { VbaOnboardingStubSelectorsIDs } from '../../../Ramp/Views/VirtualBankAccount/VbaOnboardingStub';
import { VbaDetailsSelectorsIDs } from '../../../Ramp/Views/VirtualBankAccount/VbaDetails';
import { resetBrazilMusdAutorampSetupGuard } from '../../../Ramp/Views/VirtualBankAccount/ensureBrazilMusdAutoramp';
import {
  __resetMockNetInfo,
  __setMockNetInfo,
} from '@react-native-community/netinfo';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';

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
    mockFetchVendorDisclaimers.mockResolvedValue([disclaimer]);
  });

  afterEach(() => {
    restoreVbaReduxServiceStore();
    resetBrazilMusdAutorampSetupGuard();
    __resetMockNetInfo();
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

    await waitFor(() => {
      expect(mockHydrateVbaOnboarding).toHaveBeenCalledTimes(2);
    });
    expect(
      queryByTestId(`${VbaOnboardingStubSelectorsIDs.CONTAINER}-error`),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(CreateVirtualBankAccountSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('shows the generic setup error without loading when no wallet is selected', async () => {
    const { findByTestId } = renderVbaMoneyEntry({
      overrides: {
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {
                wallets: {
                  'entropy:wallet1': {
                    groups: {
                      'entropy:wallet1/0': {
                        accounts: [],
                      },
                    },
                  },
                },
              },
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

  it('shows the account setup error when creating the account fails', async () => {
    __setMockNetInfo({ type: 'wifi', isInternetReachable: true });
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
      await findByTestId(VbaDetailsSelectorsIDs.SETUP_ERROR),
    ).toBeOnTheScreen();

    fireEvent.press(await findByTestId(VbaDetailsSelectorsIDs.RETRY_BUTTON));

    await waitFor(() => {
      expect(mockHydrateVbaOnboarding).toHaveBeenCalledTimes(3);
    });
    expect(
      await findByTestId(VbaDetailsSelectorsIDs.SETUP_ERROR),
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
});
