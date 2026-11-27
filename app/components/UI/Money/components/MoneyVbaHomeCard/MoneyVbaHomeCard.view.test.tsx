import '../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import type {
  KycProviderFlowStatus,
  KycSessionStatus,
} from '@metamask/kyc-controller';
import type { VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  getRouteParamsProbeTestId,
  getRouteProbeTestId,
} from '../../../../../../tests/component-view/render';
import {
  renderVbaHomeCard,
  restoreVbaReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vba';
import {
  VBA_TEST_APPROVED_SNAPSHOT,
  VBA_TEST_BRL_CURRENCY,
  VBA_TEST_MUSD_ON_MONAD,
  vbaTestBrlAbilities,
} from '../../../../../../tests/component-view/presets/vba';
import { VBA_KYC_VENDOR } from '../../../Ramp/Views/VirtualBankAccount/constants';
import { VbaOnboardingRoutes } from '../../../Ramp/Views/VirtualBankAccount/routes';
import { MONEY_VBA_HOME_CARD_TEST_IDS } from './MoneyVbaHomeCard.testIds';

const mockHydrateVbaOnboarding = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);
const mockReadSessionStatus = jest.mocked(
  Engine.context.KycController.readSessionStatus,
);

const rampsController = Engine.context.RampsController as unknown as {
  refreshCustomerAbilities?: jest.Mock;
};

const IDENTITY_VERIFIED = MONEY_VBA_HOME_CARD_TEST_IDS.identity_verified;
const FINISH_VERIFICATION = MONEY_VBA_HOME_CARD_TEST_IDS.finish_verification;
const KYC_PENDING = MONEY_VBA_HOME_CARD_TEST_IDS.kyc_pending;

const identityVerificationProbe = getRouteParamsProbeTestId(
  VbaOnboardingRoutes.IDENTITY_VERIFICATION,
);
const kycPendingProbe = getRouteParamsProbeTestId(
  VbaOnboardingRoutes.KYC_PENDING,
);

const kycSession = (
  finalStatus: string,
  kycStatus: string,
  currentStep?: string,
): KycSessionStatus => ({
  id: 'synthetic-kyc-session',
  finalStatus,
  externalUserId: 'synthetic-external-user',
  kycStatus,
  vendor: VBA_KYC_VENDOR,
  vendorStatus: 'pending',
  ...(currentStep ? { currentStep } : {}),
});

const withKycSession = (
  sessionStatus: KycSessionStatus,
  providerFlowStatus: KycProviderFlowStatus = 'not_started',
): DeepPartial<RootState> =>
  ({
    engine: {
      backgroundState: {
        KycController: { sessionStatus, providerFlowStatus },
      },
    },
  }) as unknown as DeepPartial<RootState>;

const accountCreateErrorProbe = getRouteParamsProbeTestId(
  VbaOnboardingRoutes.ACCOUNT_CREATE_ERROR,
);
const detailsProbe = getRouteProbeTestId(Routes.RAMP.VBA_DETAILS);

const notSubmittedSnapshot: RampsVbaOnboardingSnapshot = {
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'not_started',
  kycStatus: 'new',
  autorampStatus: 'not_ready',
};

describeForPlatforms('MoneyVbaHomeCard view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrateVbaOnboarding.mockReset();
    mockHydrateVbaOnboarding.mockResolvedValue(notSubmittedSnapshot);
    mockReadSessionStatus.mockReset();
    mockReadSessionStatus.mockReturnValue(null);
  });

  afterEach(() => {
    delete rampsController.refreshCustomerAbilities;
    restoreVbaReduxServiceStore();
  });

  it('opens the unavailable screen from the identity verified card when mUSD is not offered', async () => {
    const session = kycSession('approved', 'approved');
    mockReadSessionStatus.mockReturnValue(session);
    mockHydrateVbaOnboarding.mockResolvedValue(VBA_TEST_APPROVED_SNAPSHOT);
    rampsController.refreshCustomerAbilities = jest
      .fn()
      .mockResolvedValue(vbaTestBrlAbilities([VBA_TEST_BRL_CURRENCY]));
    const view = renderVbaHomeCard({ overrides: withKycSession(session) });

    fireEvent.press(await view.findByTestId(IDENTITY_VERIFIED.CTA_BUTTON));

    expect(await view.findByTestId(accountCreateErrorProbe)).toHaveTextContent(
      /"variant":"unavailable"/u,
    );
    expect(view.queryByTestId(detailsProbe)).not.toBeOnTheScreen();
  });

  it('opens account details from the identity verified card when mUSD is offered', async () => {
    const session = kycSession('approved', 'approved');
    mockReadSessionStatus.mockReturnValue(session);
    mockHydrateVbaOnboarding.mockResolvedValue(VBA_TEST_APPROVED_SNAPSHOT);
    rampsController.refreshCustomerAbilities = jest
      .fn()
      .mockResolvedValue(vbaTestBrlAbilities([VBA_TEST_MUSD_ON_MONAD]));
    const view = renderVbaHomeCard({ overrides: withKycSession(session) });

    fireEvent.press(await view.findByTestId(IDENTITY_VERIFIED.CTA_BUTTON));

    expect(await view.findByTestId(detailsProbe)).toBeOnTheScreen();
    expect(view.queryByTestId(accountCreateErrorProbe)).not.toBeOnTheScreen();
  });

  it('shows Finish verification, not KYC pending, for a pending session with kycStatus new', async () => {
    const session = kycSession('pending', 'new');
    const providerFlowStatus = 'abandoned' satisfies KycProviderFlowStatus;
    mockReadSessionStatus.mockReturnValue(session);
    mockHydrateVbaOnboarding.mockResolvedValue({
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      providerFlowStatus,
      kycStatus: 'pending',
      autorampStatus: 'not_ready',
    } satisfies RampsVbaOnboardingSnapshot);
    const view = renderVbaHomeCard({
      overrides: withKycSession(session, providerFlowStatus),
    });

    await waitFor(() => {
      expect(view.getByTestId(FINISH_VERIFICATION.CONTAINER)).toBeOnTheScreen();
    });
    expect(view.getByTestId(FINISH_VERIFICATION.TITLE)).toHaveTextContent(
      strings('money.vba_home_card.finish_verification.title'),
    );
    const continueButton = view.getByTestId(FINISH_VERIFICATION.CTA_BUTTON);
    expect(continueButton).toHaveTextContent(
      strings('money.vba_home_card.finish_verification.cta'),
    );
    expect(continueButton).toBeEnabled();
    expect(view.queryByTestId(KYC_PENDING.CONTAINER)).not.toBeOnTheScreen();

    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(view.getByTestId(identityVerificationProbe)).toBeOnTheScreen();
    });
    expect(view.queryByTestId(kycPendingProbe)).not.toBeOnTheScreen();
  });

  it('opens Verify identity from Continue when the session stopped at the kyc step (TRAM-4448)', async () => {
    const session = kycSession('new', 'new', 'kyc');
    mockReadSessionStatus.mockReturnValue(session);
    const view = renderVbaHomeCard({ overrides: withKycSession(session) });

    fireEvent.press(await view.findByTestId(FINISH_VERIFICATION.CTA_BUTTON));

    await waitFor(() => {
      expect(view.getByTestId(identityVerificationProbe)).toBeOnTheScreen();
    });
    expect(view.queryByTestId(kycPendingProbe)).not.toBeOnTheScreen();
  });

  it('shows the KYC pending card while the provider reviews a submitted flow', async () => {
    const view = renderVbaHomeCard({
      overrides: withKycSession(kycSession('pending', 'pending'), 'submitted'),
    });

    await waitFor(() => {
      expect(view.getByTestId(KYC_PENDING.CONTAINER)).toBeOnTheScreen();
    });
    expect(view.getByTestId(KYC_PENDING.TITLE)).toHaveTextContent(
      strings('money.vba_home_card.kyc_pending.title'),
    );
    expect(
      view.queryByTestId(FINISH_VERIFICATION.CONTAINER),
    ).not.toBeOnTheScreen();

    const pendingButton = view.getByTestId(KYC_PENDING.CTA_BUTTON);
    expect(pendingButton).toBeDisabled();

    mockHydrateVbaOnboarding.mockClear();
    fireEvent.press(pendingButton);

    expect(view.getByTestId(KYC_PENDING.CONTAINER)).toBeOnTheScreen();
    expect(view.queryByTestId(kycPendingProbe)).not.toBeOnTheScreen();
    for (const routeName of Object.values(VbaOnboardingRoutes)) {
      expect(
        view.queryByTestId(getRouteParamsProbeTestId(routeName)),
      ).not.toBeOnTheScreen();
    }
    expect(mockHydrateVbaOnboarding).not.toHaveBeenCalled();
  });
});
