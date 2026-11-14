import '../../../../../../tests/component-view/mocks';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import type { KycSessionStatus } from '@metamask/kyc-controller';
import type { VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  renderVbaMoneyEntry,
  restoreVbaReduxServiceStore,
  VbaRendererTestIds,
} from '../../../../../../tests/component-view/renderers/vba';
import { MoneyAddMoneySheetTestIds } from '../../../Money/components/MoneyAddMoneySheet/MoneyAddMoneySheet.testIds';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import { VBA_KYC_VENDOR } from '../../../Ramp/Views/VirtualBankAccount/constants';
import { KycSumSubSelectorsIDs } from '../SumSub/SumSubKyc';
import { KycRejectedSelectorsIDs } from './KycRejected';

const mockHydrateVbaOnboarding = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);

const kycSession = (
  finalStatus: string,
  kycStatus: string,
): KycSessionStatus => ({
  id: 'synthetic-kyc-session',
  finalStatus,
  externalUserId: 'synthetic-external-user',
  kycStatus,
  vendor: VBA_KYC_VENDOR,
  vendorStatus: 'completed',
});

const hydratedSnapshot = (
  kycStatus: RampsVbaOnboardingSnapshot['kycStatus'],
  providerFlowStatus: RampsVbaOnboardingSnapshot['providerFlowStatus'],
): RampsVbaOnboardingSnapshot => ({
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus,
  kycStatus,
  autorampStatus: 'not_ready',
});

const withKycSession = (
  sessionStatus: KycSessionStatus,
): DeepPartial<RootState> =>
  ({
    engine: {
      backgroundState: {
        KycController: { sessionStatus, providerFlowStatus: 'submitted' },
      },
    },
  }) as unknown as DeepPartial<RootState>;

const openFromMoneyEntry = async (
  view: ReturnType<typeof renderVbaMoneyEntry>,
): Promise<void> => {
  fireEvent.press(await view.findByTestId(VbaRendererTestIds.OPEN_MONEY_SHEET));
  fireEvent.press(
    await view.findByTestId(MoneyAddMoneySheetTestIds.BANK_ACCOUNT_ROW),
  );
};

describeForPlatforms('KycRejected view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrateVbaOnboarding.mockReset();
  });

  afterEach(() => {
    restoreVbaReduxServiceStore();
  });

  it('opens the rejected screen with Contact support for a terminal rejection', async () => {
    mockHydrateVbaOnboarding.mockResolvedValue(
      hydratedSnapshot('rejected', 'submitted'),
    );
    const view = renderVbaMoneyEntry({
      overrides: {
        security: {
          shouldShowConsentSheet: false,
          dataSharingPreference: false,
        },
        ...withKycSession(kycSession('rejected', 'rejected')),
      },
    });

    await openFromMoneyEntry(view);

    expect(
      await view.findByTestId(KycRejectedSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    const contactSupport = view.getByTestId(
      KycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON,
    );
    expect(contactSupport).toHaveTextContent(
      strings('kyc.kyc_rejected.button'),
    );
    expect(
      view.queryByTestId(KycRejectedSelectorsIDs.RETRY_BUTTON),
    ).not.toBeOnTheScreen();

    const openUrl = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined as never);
    fireEvent.press(contactSupport);

    expect(openUrl).toHaveBeenCalledWith(METAMASK_SUPPORT_URL);
    openUrl.mockRestore();
  });

  it('opens the rejected screen with Try again when KYC asked for a retry before resubmission', async () => {
    mockHydrateVbaOnboarding.mockResolvedValue(
      hydratedSnapshot('retry', 'not_started'),
    );
    const view = renderVbaMoneyEntry({
      overrides: withKycSession(kycSession('retry', 'retry')),
    });

    await openFromMoneyEntry(view);

    expect(
      await view.findByTestId(KycRejectedSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      view.getByText(strings('kyc.kyc_rejected.retry_description')),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(KycRejectedSelectorsIDs.RETRY_BUTTON),
    ).toHaveTextContent(strings('kyc.kyc_rejected.retry_button'));
    expect(
      view.queryByTestId(KycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(view.getByTestId(KycRejectedSelectorsIDs.RETRY_BUTTON));

    expect(
      await view.findByTestId(KycSumSubSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });
});
