import '../../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import en from '../../../../../../locales/languages/en.json';
import Engine from '../../../../../core/Engine';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { getRouteParamsProbeTestId } from '../../../../../../tests/component-view/render';
import {
  renderVbaKycRejected,
  restoreVbaReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vba';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { VbaOnboardingRoutes } from '../../../Ramp/Views/VirtualBankAccount/routes';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import { VbaKycRejectedSelectorsIDs } from './KycRejected';

const englishRejected = en.virtual_bank_account.kyc_rejected;

const REJECTED_SESSION = {
  id: 'session-1',
  externalUserId: 'user-1',
  vendor: 'sumsub',
  vendorStatus: 'completed',
  finalStatus: 'rejected',
  kycStatus: 'rejected',
};

const RETRY_SESSION = {
  ...REJECTED_SESSION,
  vendorStatus: 'pending',
  finalStatus: 'pending',
  kycStatus: 'retry',
};

const MIXED_REJECTED_SESSION = {
  ...REJECTED_SESSION,
  finalStatus: 'retry',
  kycStatus: 'rejected',
};

const kycSessionOverride = (
  session: typeof REJECTED_SESSION,
): DeepPartial<RootState> =>
  ({
    engine: {
      backgroundState: {
        KycController: {
          sessionStatus: session,
          providerFlowStatus: 'not_started',
        },
      },
    },
  }) as unknown as DeepPartial<RootState>;

const rejectedHydrate = {
  ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'not_started' as const,
  kycStatus: 'rejected' as const,
  autorampStatus: 'not_ready' as const,
};

const mockHydrateVbaOnboarding = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);

describeForPlatforms('VbaKycRejected view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrateVbaOnboarding.mockResolvedValue(rejectedHydrate);
  });

  afterEach(() => {
    restoreVbaReduxServiceStore();
  });

  it('shows Contact support and hides Try again when rejection is terminal', async () => {
    const { findByTestId, getByText, queryByTestId, queryByText } =
      renderVbaKycRejected({
        overrides: kycSessionOverride(REJECTED_SESSION),
      });

    expect(
      await findByTestId(VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_rejected.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_rejected.description')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_rejected.button')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(VbaKycRejectedSelectorsIDs.RETRY_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByText(strings('virtual_bank_account.kyc_rejected.retry_button')),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      await findByTestId(VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    );

    expect(await findByTestId('support-consent-sheet')).toBeOnTheScreen();
  });

  it('shows Contact support when finalStatus is retry but kycStatus is rejected', async () => {
    const { findByTestId, queryByTestId } = renderVbaKycRejected({
      overrides: kycSessionOverride(MIXED_REJECTED_SESSION),
    });

    fireEvent.press(
      await findByTestId(VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    );

    expect(await findByTestId('support-consent-sheet')).toBeOnTheScreen();
    expect(
      queryByTestId(VbaKycRejectedSelectorsIDs.RETRY_BUTTON),
    ).not.toBeOnTheScreen();
    expect(mockHydrateVbaOnboarding).not.toHaveBeenCalled();
  });

  it('passes retryRejectedKyc when Try again is pressed', async () => {
    mockHydrateVbaOnboarding.mockResolvedValue({
      ...rejectedHydrate,
      kycStatus: 'retry',
    });
    const { findByTestId, getByTestId, queryByTestId } = renderVbaKycRejected({
      overrides: kycSessionOverride(RETRY_SESSION),
    });

    expect(
      await findByTestId(VbaKycRejectedSelectorsIDs.RETRY_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(VbaKycRejectedSelectorsIDs.RETRY_BUTTON));

    expect(
      await findByTestId(
        getRouteParamsProbeTestId(VbaOnboardingRoutes.IDENTITY_VERIFICATION),
      ),
    ).toHaveTextContent(/"kycStatus":"retry"/);
    expect(
      queryByTestId(VbaKycRejectedSelectorsIDs.RETRY_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it.failing(
    'Portuguese copy is pending: rejected screen must show a support label, not the English source or Try again',
    async () => {
      const previousLocale = I18n.locale;
      I18n.locale = 'pt';

      try {
        const { findByTestId, getByTestId, queryAllByText } =
          renderVbaKycRejected({
            overrides: kycSessionOverride(REJECTED_SESSION),
          });
        const button = await findByTestId(
          VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON,
        );

        expect(button).not.toHaveTextContent(/\[missing/i);
        expect(queryAllByText(englishRejected.title)).toHaveLength(0);
        expect(queryAllByText(englishRejected.description)).toHaveLength(0);
        expect(
          getByTestId(VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
        ).not.toHaveTextContent(/try again|tentar novamente/i);
        expect(
          getByTestId(VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
        ).toHaveTextContent(/support|suporte/i);
        expect(
          getByTestId(VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
        ).not.toHaveTextContent(englishRejected.button);
      } finally {
        I18n.locale = previousLocale;
      }
    },
  );
});
