import '../../../../../../tests/component-view/mocks';
import { Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import type { KycSessionStatus } from '@metamask/kyc-controller';
import type { VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  openVbaBankAccountFromMoney,
  renderVbaMoneyEntry,
  restoreVbaReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vba';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import { VBA_KYC_VENDOR } from '../../../Ramp/Views/VirtualBankAccount/constants';
import { KycSumSubSelectorsIDs } from '../SumSub/SumSubKyc';
import { KycRejectedSelectorsIDs } from './KycRejected';

const mockHydrateVbaOnboarding = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);
const launchProviderFlow = jest.mocked(
  Engine.context.KycController.launchProviderFlow,
);

let openUrlSpy: jest.SpiedFunction<typeof Linking.openURL> | undefined;

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

describeForPlatforms('KycRejected view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrateVbaOnboarding.mockReset();
  });

  afterEach(() => {
    restoreVbaReduxServiceStore();
    openUrlSpy?.mockRestore();
    openUrlSpy = undefined;
    launchProviderFlow.mockReset();
    launchProviderFlow.mockResolvedValue('abandoned');
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

  it('opens the rejected screen with Contact support for a terminal rejection', async () => {
    mockHydrateVbaOnboarding.mockResolvedValueOnce(
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

    await openVbaBankAccountFromMoney(view.findByTestId);

    await waitFor(() => {
      expect(
        view.getByTestId(KycRejectedSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
    const contactSupport = view.getByTestId(
      KycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON,
    );
    expect(contactSupport).toHaveTextContent(
      strings('kyc.kyc_rejected.button'),
    );
    expect(
      view.queryByTestId(KycRejectedSelectorsIDs.RETRY_BUTTON),
    ).not.toBeOnTheScreen();

    openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined as never);
    fireEvent.press(contactSupport);

    await waitFor(() => {
      expect(openUrlSpy).toHaveBeenCalledWith(METAMASK_SUPPORT_URL);
    });
    // The button is busy until the support action settles.
    await waitFor(() => {
      expect(
        view.getByTestId(KycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
      ).toBeEnabled();
    });
    expect(openUrlSpy).toHaveBeenCalledTimes(1);
  });

  it('opens the rejected screen with Try again when KYC asked for a retry before resubmission', async () => {
    mockHydrateVbaOnboarding.mockResolvedValue(
      hydratedSnapshot('retry', 'not_started'),
    );
    const view = renderVbaMoneyEntry({
      overrides: withKycSession(kycSession('retry', 'retry')),
    });

    await openVbaBankAccountFromMoney(view.findByTestId);

    await waitFor(() => {
      expect(
        view.getByTestId(KycRejectedSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
    expect(
      view.getByText(strings('kyc.kyc_rejected.retry_description')),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(KycRejectedSelectorsIDs.RETRY_BUTTON),
    ).toHaveTextContent(strings('kyc.kyc_rejected.retry_button'));
    expect(
      view.queryByTestId(KycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    ).not.toBeOnTheScreen();

    // The shared mock abandons the provider, which pops this screen in the
    // same turn. A launch that has not settled leaves the SumSub screen up.
    launchProviderFlow.mockImplementation(() => new Promise(() => undefined));
    fireEvent.press(view.getByTestId(KycRejectedSelectorsIDs.RETRY_BUTTON));

    await waitFor(() => {
      expect(
        view.getByTestId(KycSumSubSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
  });
});
