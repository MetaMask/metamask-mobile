import '../../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import type { VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  renderVbaMoneyEntry,
  restoreVbaReduxServiceStore,
  VbaRendererTestIds,
} from '../../../../../../tests/component-view/renderers/vba';
import { MoneyAddMoneySheetTestIds } from '../../../Money/components/MoneyAddMoneySheet/MoneyAddMoneySheet.testIds';
import { KycPendingSelectorsIDs } from '../../../KYC/Views/Status/KycPending';
import { KycSumSubSelectorsIDs } from '../../../KYC/Views/SumSub/SumSubKyc';

const mockHydrateVbaOnboarding = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);

const pendingNotStarted: RampsVbaOnboardingSnapshot = {
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'not_started',
  kycStatus: 'pending',
  autorampStatus: 'not_ready',
};

describeForPlatforms('VBA pending session that was never submitted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrateVbaOnboarding.mockReset();
    mockHydrateVbaOnboarding.mockResolvedValue(pendingNotStarted);
  });

  afterEach(() => {
    restoreVbaReduxServiceStore();
  });

  it('opens identity verification, not the pending screen, from the bank account row (TRAM-4448)', async () => {
    const view = renderVbaMoneyEntry();

    fireEvent.press(
      await view.findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET),
    );
    fireEvent.press(
      await view.findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
    );

    expect(
      await view.findByTestId(KycSumSubSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(KycPendingSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });
});
