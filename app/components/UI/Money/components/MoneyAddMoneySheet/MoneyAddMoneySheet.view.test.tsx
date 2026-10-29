import '../../../../../../tests/component-view/mocks';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import Engine from '../../../../../core/Engine';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { VBA_TEST_MONEY_ADDRESS } from '../../../../../../tests/component-view/presets/vba';
import {
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
});
