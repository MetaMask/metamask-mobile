import '../../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import {
  renderVbaKycRejected,
  restoreVbaReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vba';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { VbaOnboardingRoutes } from '../../../Ramp/Views/VirtualBankAccount/routes';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import { VbaKycRejectedSelectorsIDs } from './KycRejected';

const UNRESOLVED_COPY = /\[missing|virtual_bank_account\./iu;

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

const kycSessionOverride = (session: typeof REJECTED_SESSION) =>
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

const mockHydrateVbaOnboarding = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);

const expectResolvedCopy = (value: string) => {
  expect(value).not.toMatch(UNRESOLVED_COPY);
};

describeForPlatforms('VbaKycRejected view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrateVbaOnboarding.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'not_started',
      kycStatus: 'retry',
      autorampStatus: 'not_ready',
    });
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

  it('shows Try again and hides Contact support when the session can be retried', async () => {
    const { findByTestId, getByText, queryByTestId } = renderVbaKycRejected({
      overrides: kycSessionOverride(RETRY_SESSION),
    });

    expect(
      await findByTestId(VbaKycRejectedSelectorsIDs.RETRY_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_rejected.retry_description')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.kyc_rejected.retry_button')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      await findByTestId(VbaKycRejectedSelectorsIDs.RETRY_BUTTON),
    );

    expect(
      await findByTestId(
        getRouteProbeTestId(VbaOnboardingRoutes.IDENTITY_VERIFICATION),
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('renders the rejected screen in Portuguese (pt) with resolved copy', async () => {
    const previousLocale = I18n.locale;
    I18n.locale = 'pt';

    try {
      const { findByTestId, getByText } = renderVbaKycRejected({
        overrides: kycSessionOverride(REJECTED_SESSION),
      });
      const title = strings('virtual_bank_account.kyc_rejected.title');
      const description = strings(
        'virtual_bank_account.kyc_rejected.description',
      );
      const button = strings('virtual_bank_account.kyc_rejected.button');

      expect(
        await findByTestId(VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
      ).toBeOnTheScreen();
      expectResolvedCopy(title);
      expectResolvedCopy(description);
      expectResolvedCopy(button);
      expect(getByText(title)).toBeOnTheScreen();
      expect(getByText(description)).toBeOnTheScreen();
      expect(getByText(button)).toBeOnTheScreen();
    } finally {
      I18n.locale = previousLocale;
    }
  });

  it.todo(
    'Portuguese copy is pending: rejected screen must not keep English source text',
  );
});
