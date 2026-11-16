import '../../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import type { KycSessionStatus } from '@metamask/kyc-controller';
import type { VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { getRouteParamsProbeTestId } from '../../../../../../tests/component-view/render';
import {
  renderVbaMoneyEntryWithDestinationProbes,
  restoreVbaReduxServiceStore,
  VbaRendererTestIds,
} from '../../../../../../tests/component-view/renderers/vba';
import { MoneyAddMoneySheetTestIds } from '../../../Money/components/MoneyAddMoneySheet/MoneyAddMoneySheet.testIds';
import { VBA_KYC_VENDOR } from './constants';
import { VbaOnboardingRoutes } from './routes';

const kycController = Engine.context.KycController;
const mockReadSessionStatus = jest.mocked(kycController.readSessionStatus);
const mockGetSessionStatusForVendor = jest.mocked(
  kycController.getSessionStatusForVendor,
);
const mockStartSession = jest.mocked(kycController.startSession);
const mockKycReset = jest.mocked(kycController.reset);
const mockHydrateVbaOnboarding = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);

const GEO_COUNTRY_MISMATCH_ERROR =
  'KycController already initialized with a different geoCountry';

const kycPendingProbe = getRouteParamsProbeTestId(
  VbaOnboardingRoutes.KYC_PENDING,
);
const errorRouteProbe = getRouteParamsProbeTestId(VbaOnboardingRoutes.ERROR);

const kycSession = (
  finalStatus: string,
  kycStatus: string,
): KycSessionStatus => ({
  id: 'synthetic-kyc-session',
  finalStatus,
  externalUserId: 'synthetic-external-user',
  kycStatus,
  vendor: VBA_KYC_VENDOR,
  vendorStatus: 'pending',
});

const submittedPendingSnapshot: RampsVbaOnboardingSnapshot = {
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'submitted',
  kycStatus: 'pending',
  autorampStatus: 'not_ready',
};

const openBankAccountEntry = async (
  view: ReturnType<typeof renderVbaMoneyEntryWithDestinationProbes>,
): Promise<void> => {
  fireEvent.press(await view.findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
  fireEvent.press(
    await view.findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
  );
};

describeForPlatforms('VBA onboarding failure view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrateVbaOnboarding.mockReset();
    mockHydrateVbaOnboarding.mockResolvedValue(submittedPendingSnapshot);
    mockReadSessionStatus.mockReset();
    mockReadSessionStatus.mockReturnValue(null);
    mockGetSessionStatusForVendor.mockReset();
    mockGetSessionStatusForVendor.mockResolvedValue(null);
    mockStartSession.mockReset();
    mockStartSession.mockResolvedValue(kycSession('pending', 'pending'));
  });

  afterEach(() => {
    restoreVbaReduxServiceStore();
    mockReadSessionStatus.mockReset();
    mockReadSessionStatus.mockReturnValue(null);
    mockGetSessionStatusForVendor.mockReset();
    mockGetSessionStatusForVendor.mockResolvedValue(null);
    mockStartSession.mockReset();
    mockStartSession.mockImplementation(() =>
      Promise.resolve(undefined as unknown as KycSessionStatus),
    );
    mockHydrateVbaOnboarding.mockReset();
    mockHydrateVbaOnboarding.mockResolvedValue({
      sessionExists: false,
      vendorDisclaimersComplete: false,
      sessionDisclaimersComplete: false,
      providerFlowStatus: 'not_started',
      kycStatus: 'none',
      autorampStatus: 'not_ready',
    });
  });

  describe('geoCountry mismatch from the Money entry (TRAM-4399)', () => {
    it('resets and starts a fresh session when no KYC session is stored', async () => {
      mockGetSessionStatusForVendor.mockResolvedValue(
        kycSession('pending', 'pending'),
      );
      mockStartSession.mockRejectedValueOnce(
        new Error(GEO_COUNTRY_MISMATCH_ERROR),
      );
      const view = renderVbaMoneyEntryWithDestinationProbes();

      await openBankAccountEntry(view);

      expect(await view.findByTestId(kycPendingProbe)).toBeOnTheScreen();
      expect(mockKycReset).toHaveBeenCalledTimes(1);
      expect(mockStartSession).toHaveBeenCalledTimes(2);
      expect(view.queryByTestId(errorRouteProbe)).not.toBeOnTheScreen();
    });

    it('keeps the stored KYC session and continues onboarding', async () => {
      mockReadSessionStatus.mockReturnValue(kycSession('pending', 'pending'));
      mockStartSession.mockRejectedValueOnce(
        new Error(GEO_COUNTRY_MISMATCH_ERROR),
      );
      const view = renderVbaMoneyEntryWithDestinationProbes();

      await openBankAccountEntry(view);

      expect(await view.findByTestId(kycPendingProbe)).toBeOnTheScreen();
      expect(mockKycReset).not.toHaveBeenCalled();
      expect(view.queryByTestId(errorRouteProbe)).not.toBeOnTheScreen();
    });
  });
});
