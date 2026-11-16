import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import {
  getDefaultKycControllerState,
  type KycControllerState,
  type KycDisclaimersCatalog,
  type KycProviderFlowStatus,
  type KycSessionStatus,
} from '@metamask/kyc-controller';
import type { VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot } from '@metamask/ramps-controller';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  renderVbaMoneyEntry,
  restoreVbaReduxServiceStore,
  VbaRendererTestIds,
} from '../../../../../../tests/component-view/renderers/vba';
import { KycRejectedSelectorsIDs } from '../../../KYC/Views/Status/KycRejected';
import { KycPendingSelectorsIDs } from '../../../KYC/Views/Status/KycPending';
import { KycSumSubSelectorsIDs } from '../../../KYC/Views/SumSub/SumSubKyc';
import { MoneyAddMoneySheetTestIds } from '../../../Money/components/MoneyAddMoneySheet/MoneyAddMoneySheet.testIds';

// SumSub consent, the provider launch, and the following hydrate share one wait.
const ONBOARDING_STEP_TIMEOUT_MS = 5000;

const emptySessionCatalog = {
  idOS: [],
  kycProvider: [],
} satisfies KycDisclaimersCatalog;

const readyForUpload = {
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'not_started',
  kycStatus: 'none',
  autorampStatus: 'not_ready',
} satisfies RampsVbaOnboardingSnapshot;

const pendingAfterUpload = {
  ...readyForUpload,
  providerFlowStatus: 'submitted',
  kycStatus: 'pending',
} satisfies RampsVbaOnboardingSnapshot;

const proofOfAddressRetry = {
  ...pendingAfterUpload,
  kycStatus: 'retry',
} satisfies RampsVbaOnboardingSnapshot;

const proofOfAddressRetrySession = {
  id: 'kyc-session-poa-retry',
  externalUserId: 'external-user-poa-retry',
  vendor: 'iron',
  vendorStatus: 'retry',
  finalStatus: 'retry',
  kycStatus: 'retry',
} satisfies KycSessionStatus;

const emptyOnboardingSnapshot = {
  sessionExists: false,
  vendorDisclaimersComplete: false,
  sessionDisclaimersComplete: false,
  providerFlowStatus: 'not_started',
  kycStatus: 'none',
  autorampStatus: 'not_ready',
} satisfies RampsVbaOnboardingSnapshot;

const hangProviderFlow = (): Promise<KycProviderFlowStatus> =>
  new Promise(() => undefined);

const launchProviderFlow = jest.mocked(
  Engine.context.KycController.launchProviderFlow,
);
const fetchSessionDisclaimers = jest.mocked(
  Engine.context.KycController.fetchSessionDisclaimers,
);
const recordSessionDisclaimers = jest.mocked(
  Engine.context.KycController.recordSessionDisclaimers,
);
const hydrateVbaOnboarding = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);

let previousEngineState: PropertyDescriptor | undefined;
let didAssignEngineState = false;

const publishKycSession = (
  store: ReturnType<typeof renderVbaMoneyEntry>['store'],
  sessionStatus: KycSessionStatus,
): void => {
  const kycState: KycControllerState = {
    ...getDefaultKycControllerState(),
    email: 'ada@example.com',
    vendor: 'iron',
    geoCountry: 'BRA',
    providerFlowStatus: 'submitted',
    sessionStatus,
  };
  if (!didAssignEngineState) {
    previousEngineState = Object.getOwnPropertyDescriptor(Engine, 'state');
    didAssignEngineState = true;
  }
  Object.defineProperty(Engine, 'state', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: { KycController: kycState },
  });
  store.dispatch(updateBgState({ key: 'KycController' }));
};

const restoreEngineKycState = (): void => {
  if (!didAssignEngineState) {
    return;
  }
  didAssignEngineState = false;
  if (previousEngineState) {
    Object.defineProperty(Engine, 'state', previousEngineState);
    return;
  }
  Reflect.deleteProperty(Engine, 'state');
};

const openBankAccount = async (
  findByTestId: ReturnType<typeof renderVbaMoneyEntry>['findByTestId'],
): Promise<void> => {
  fireEvent.press(await findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
  fireEvent.press(
    await findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
  );
};

describeForPlatforms('VBA proof-of-address retry', () => {
  const previousKycState = Engine.context.KycController.state;

  beforeEach(() => {
    launchProviderFlow.mockReset();
    fetchSessionDisclaimers.mockReset();
    recordSessionDisclaimers.mockReset();
    hydrateVbaOnboarding.mockReset();
    fetchSessionDisclaimers.mockResolvedValue(emptySessionCatalog);
    recordSessionDisclaimers.mockResolvedValue(undefined);
    launchProviderFlow.mockResolvedValue('abandoned');
    hydrateVbaOnboarding.mockResolvedValue(emptyOnboardingSnapshot);
    Engine.context.KycController.state = {
      ...getDefaultKycControllerState(),
      email: 'ada@example.com',
      vendor: 'iron',
      geoCountry: 'BRA',
    };
  });

  afterEach(() => {
    Engine.context.KycController.state = previousKycState;
    restoreEngineKycState();
    restoreVbaReduxServiceStore();
    launchProviderFlow.mockReset();
    launchProviderFlow.mockResolvedValue('abandoned');
    hydrateVbaOnboarding.mockReset();
    hydrateVbaOnboarding.mockResolvedValue(emptyOnboardingSnapshot);
    fetchSessionDisclaimers.mockReset();
    fetchSessionDisclaimers.mockResolvedValue(emptySessionCatalog);
    recordSessionDisclaimers.mockReset();
    recordSessionDisclaimers.mockResolvedValue(undefined);
  });

  it('shows the retry screen after submit, pending, and a retry status, and launches SumSub once', async () => {
    hydrateVbaOnboarding
      .mockResolvedValueOnce(readyForUpload)
      .mockResolvedValueOnce(pendingAfterUpload)
      .mockResolvedValue(proofOfAddressRetry);
    launchProviderFlow.mockImplementation(() => {
      if (launchProviderFlow.mock.calls.length > 1) {
        return hangProviderFlow();
      }
      return Promise.resolve('submitted');
    });

    const { findByTestId, getByTestId, getByText, queryByTestId, store } =
      renderVbaMoneyEntry();

    await openBankAccount(findByTestId);

    expect(
      await findByTestId(
        KycPendingSelectorsIDs.CONTAINER,
        {},
        { timeout: ONBOARDING_STEP_TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    expect(getByText(strings('kyc.kyc_taking_longer.title'))).toBeOnTheScreen();
    expect(launchProviderFlow).toHaveBeenCalledTimes(1);

    act(() => {
      publishKycSession(store, proofOfAddressRetrySession);
    });

    await waitFor(
      () => {
        expect(launchProviderFlow).toHaveBeenCalledTimes(1);
        expect(
          getByTestId(KycRejectedSelectorsIDs.RETRY_BUTTON),
        ).toBeOnTheScreen();
      },
      { timeout: ONBOARDING_STEP_TIMEOUT_MS },
    );
    expect(getByText(strings('kyc.kyc_rejected.title'))).toBeOnTheScreen();
    expect(
      getByText(strings('kyc.kyc_rejected.retry_description')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('kyc.kyc_rejected.retry_button')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('kyc.kyc_rejected.identity_document_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('kyc.kyc_rejected.selfie_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('kyc.kyc_rejected.details_title')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(KycSumSubSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(KycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('shows the retry screen and does not launch SumSub when onboarding reopens on a retry after a submitted upload', async () => {
    hydrateVbaOnboarding.mockResolvedValue(proofOfAddressRetry);
    launchProviderFlow.mockImplementation(hangProviderFlow);

    const view = renderVbaMoneyEntry({
      overrides: {
        engine: {
          backgroundState: {
            KycController: {
              ...getDefaultKycControllerState(),
              email: 'ada@example.com',
              vendor: 'iron',
              geoCountry: 'BRA',
              providerFlowStatus: 'submitted',
              sessionStatus: proofOfAddressRetrySession,
            },
          },
        },
      },
    });

    await openBankAccount(view.findByTestId);

    await waitFor(
      () => {
        expect(launchProviderFlow).not.toHaveBeenCalled();
        expect(
          view.getByTestId(KycRejectedSelectorsIDs.RETRY_BUTTON),
        ).toBeOnTheScreen();
      },
      { timeout: ONBOARDING_STEP_TIMEOUT_MS },
    );
    expect(view.getByText(strings('kyc.kyc_rejected.title'))).toBeOnTheScreen();
    expect(
      view.getByText(strings('kyc.kyc_rejected.retry_description')),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(KycSumSubSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });
});
