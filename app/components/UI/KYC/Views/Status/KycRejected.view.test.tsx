import '../../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import en from '../../../../../../locales/languages/en.json';
import pt from '../../../../../../locales/languages/pt.json';
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

const TRY_AGAIN_LABELS = [
  en.virtual_bank_account.kyc_rejected.retry_button,
  'Tentar novamente',
] as const;

const ENGLISH_COPY_ALLOWLIST = new Set([
  'virtual_bank_account.create_virtual_bank_account.agreement_suffix',
  'virtual_bank_account.choose_currency.row_label',
  'virtual_bank_account.choose_currency.currencies.eur',
  'virtual_bank_account.vba_details.copia_cola_label',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const untranslatedLeafKeys = (
  english: unknown,
  portuguese: unknown,
  path: string,
): string[] => {
  if (ENGLISH_COPY_ALLOWLIST.has(path)) {
    return [];
  }
  if (typeof english === 'string') {
    if (typeof portuguese !== 'string') {
      return [`${path} (missing)`];
    }
    if (portuguese === english) {
      return [`${path} (identical to en)`];
    }
    return [];
  }
  if (!isRecord(english)) {
    return [];
  }
  return Object.entries(english).flatMap(([key, child]) =>
    untranslatedLeafKeys(
      child,
      isRecord(portuguese) ? portuguese[key] : undefined,
      `${path}.${key}`,
    ),
  );
};

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
      getByText(
        strings('virtual_bank_account.kyc_rejected.contact_support_button'),
      ),
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

  it('renders the rejected screen in Portuguese without raw keys', async () => {
    const previousLocale = I18n.locale;
    I18n.locale = 'pt';

    try {
      const { findByTestId, getByTestId } = renderVbaKycRejected({
        overrides: kycSessionOverride(REJECTED_SESSION),
      });

      expect(
        await findByTestId(VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(VbaKycRejectedSelectorsIDs.CONTAINER),
      ).not.toHaveTextContent(/\[missing|virtual_bank_account\./i);
    } finally {
      I18n.locale = previousLocale;
    }
  });

  // Flips to `it` once the Crowdin sync lands.
  it.failing(
    'Portuguese copy is pending: kyc_rejected keys must not be missing or identical to English',
    () => {
      const flagged = untranslatedLeafKeys(
        en.virtual_bank_account.kyc_rejected,
        pt.virtual_bank_account.kyc_rejected,
        'virtual_bank_account.kyc_rejected',
      );

      expect(flagged).toEqual([]);
    },
  );

  it('Portuguese copy is pending: rejected button must not use the Try again label', async () => {
    const previousLocale = I18n.locale;
    I18n.locale = 'pt';

    try {
      const { findByTestId, getByText, queryByText } = renderVbaKycRejected({
        overrides: kycSessionOverride(REJECTED_SESSION),
      });

      expect(
        await findByTestId(VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByText(
          strings('virtual_bank_account.kyc_rejected.contact_support_button'),
        ),
      ).toBeOnTheScreen();
      for (const label of TRY_AGAIN_LABELS) {
        expect(queryByText(label)).not.toBeOnTheScreen();
      }
    } finally {
      I18n.locale = previousLocale;
    }
  });
});
