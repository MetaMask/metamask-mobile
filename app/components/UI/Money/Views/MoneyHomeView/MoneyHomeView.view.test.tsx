import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  renderMoneyHomeMfa,
  renderMoneyHomeVbaCard,
} from '../../../../../../tests/component-view/renderers/moneyHome';
import Routes from '../../../../../constants/navigation/Routes';
import { moneyMfaStore } from '../../../../../lib/Money/mfa/moneyMfaStore';
import { moneyAccountMigration } from '../../../../../lib/Money/mfa/moneyAccountMigration';
import { MoneyMfaTestIds } from '../../components/MoneyMfa/MoneyMfa.testIds';
import { MoneyActionButtonRowTestIds } from '../../components/MoneyActionButtonRow/MoneyActionButtonRow.testIds';
import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  type VbaOnboardingSnapshot,
} from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import { KycRejectedSelectorsIDs } from '../../../KYC/Views/Status/KycRejected';
import { KycSumSubSelectorsIDs } from '../../../KYC/Views/SumSub/SumSubKyc';
import { MONEY_VBA_HOME_CARD_TEST_IDS } from '../../components/MoneyVbaHomeCard/MoneyVbaHomeCard.testIds';

// Hydrate, then the root stack resets onto the VBA onboarding navigator.
const ONBOARDING_TIMEOUT_MS = 5000;

const hydrateVbaOnboarding = Engine.context.RampsController
  .hydrateVbaOnboarding as jest.Mock;
const defaultHydrateVbaOnboarding =
  hydrateVbaOnboarding.getMockImplementation();
const launchProviderFlow = jest.mocked(
  Engine.context.KycController.launchProviderFlow,
);
const defaultLaunchProviderFlow = launchProviderFlow.getMockImplementation();

const hydratedSnapshot = (
  kycStatus: VbaOnboardingSnapshot['kycStatus'],
): VbaOnboardingSnapshot => ({
  ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
  sessionExists: true,
  vendorDisclaimersComplete: true,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'submitted',
  kycStatus,
  autorampStatus: 'not_ready',
});

describeForPlatforms('MoneyHomeView VBA KYC card', () => {
  beforeEach(() => {
    hydrateVbaOnboarding.mockReset();
    hydrateVbaOnboarding.mockResolvedValue(hydratedSnapshot('none'));
    launchProviderFlow.mockReset();
    launchProviderFlow.mockResolvedValue('abandoned');
  });

  afterEach(() => {
    hydrateVbaOnboarding.mockReset();
    hydrateVbaOnboarding.mockImplementation(defaultHydrateVbaOnboarding);
    launchProviderFlow.mockReset();
    if (defaultLaunchProviderFlow) {
      launchProviderFlow.mockImplementation(defaultLaunchProviderFlow);
    }
  });

  it('opens the retry screen from the shared finish_verification CTA when KYC finalStatus is retry', async () => {
    hydrateVbaOnboarding.mockResolvedValue(hydratedSnapshot('retry'));

    const { findByTestId, getByTestId, queryByTestId, queryByText } =
      renderMoneyHomeVbaCard('retry');

    const retryCard = await findByTestId(
      MONEY_VBA_HOME_CARD_TEST_IDS.kyc_retry.CONTAINER,
    );

    expect(retryCard).toBeOnTheScreen();
    expect(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_retry.TITLE),
    ).toHaveTextContent(
      strings('money.vba_home_card.finish_verification.title'),
    );
    expect(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_retry.DESCRIPTION),
    ).toHaveTextContent(
      strings('money.vba_home_card.finish_verification.description'),
    );
    expect(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_retry.CTA_BUTTON),
    ).toHaveTextContent(strings('money.vba_home_card.finish_verification.cta'));
    expect(
      queryByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_decision.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(
        MONEY_VBA_HOME_CARD_TEST_IDS.kyc_decision.DISMISS_BUTTON as string,
      ),
    ).not.toBeOnTheScreen();
    expect(
      queryByText(strings('money.vba_home_card.kyc_decision.dismiss')),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_retry.CTA_BUTTON),
    );

    await findByTestId(
      KycRejectedSelectorsIDs.RETRY_BUTTON,
      {},
      { timeout: ONBOARDING_TIMEOUT_MS },
    );
    expect(getByTestId(KycRejectedSelectorsIDs.RETRY_BUTTON)).toHaveTextContent(
      strings('kyc.kyc_rejected.retry_button'),
    );
    expect(
      queryByTestId(KycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(KycSumSubSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
    // Try again on this screen is the only control that relaunches SumSub.
    expect(launchProviderFlow).not.toHaveBeenCalled();
  });

  it('dismisses the terminal card when KYC finalStatus is rejected', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderMoneyHomeVbaCard('rejected');

    expect(
      await findByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_decision.TITLE),
    ).toHaveTextContent(strings('money.vba_home_card.kyc_decision.title'));
    expect(
      queryByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_retry.CONTAINER),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(
        MONEY_VBA_HOME_CARD_TEST_IDS.kyc_decision.DISMISS_BUTTON as string,
      ),
    );

    expect(
      queryByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_decision.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_retry.CONTAINER),
    ).not.toBeOnTheScreen();
  });
});

describeForPlatforms('MoneyHomeView 2-step verification', () => {
  beforeEach(() => {
    moneyMfaStore.reset();
    moneyAccountMigration.reset();
  });

  afterEach(() => {
    moneyMfaStore.reset();
    moneyAccountMigration.reset();
  });

  const startSettingUp = () => {
    act(() => {
      moneyAccountMigration.start().catch(() => undefined);
    });
  };

  it('opens the intro from the setup card when 2-step verification is not set up', async () => {
    const { findByTestId, getByTestId, queryByTestId } = renderMoneyHomeMfa();

    fireEvent.press(await findByTestId(MoneyMfaTestIds.SETUP_CARD_BUTTON));

    expect(
      await findByTestId(`route-${Routes.MONEY.MFA_INTRO}`),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyMfaTestIds.HEADER_BADGE)).not.toBeOnTheScreen();
    expect(getByTestId(`route-${Routes.MONEY.MFA_INTRO}`)).toBeOnTheScreen();
  });

  it('opens the setting up sheet from Transfer while the Money account is set up', async () => {
    startSettingUp();
    const { findByTestId, queryByTestId } = renderMoneyHomeMfa();

    expect(
      await findByTestId(MoneyMfaTestIds.SETTING_UP_BANNER),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyMfaTestIds.SETUP_CARD)).not.toBeOnTheScreen();

    fireEvent.press(
      await findByTestId(MoneyActionButtonRowTestIds.TRANSFER_BUTTON),
    );

    expect(
      await findByTestId(MoneyMfaTestIds.SETTING_UP_SHEET),
    ).toBeOnTheScreen();
  });

  it('hides the setting up banner when it is closed', async () => {
    startSettingUp();
    const { findByTestId, queryByTestId } = renderMoneyHomeMfa();

    fireEvent.press(
      await findByTestId(MoneyMfaTestIds.SETTING_UP_BANNER_CLOSE),
    );

    await waitFor(() =>
      expect(
        queryByTestId(MoneyMfaTestIds.SETTING_UP_BANNER),
      ).not.toBeOnTheScreen(),
    );
    expect(moneyMfaStore.getState().isMigrationBannerDismissed).toBe(true);
  });

  it('opens the enabled sheet from the header badge when 2-step verification is on', async () => {
    moneyMfaStore.setState({ isMoneyAccountMfaEnabled: true });
    const { findByTestId, queryByTestId } = renderMoneyHomeMfa();

    fireEvent.press(await findByTestId(MoneyMfaTestIds.HEADER_BADGE));

    expect(await findByTestId(MoneyMfaTestIds.ENABLED_SHEET)).toBeOnTheScreen();
    expect(queryByTestId(MoneyMfaTestIds.SETUP_CARD)).not.toBeOnTheScreen();
  });

  it('shows the turned on confirmation once after setup finishes', async () => {
    moneyMfaStore.setState({
      isMoneyAccountMfaEnabled: true,
      hasUnseenEnabledConfirmation: true,
    });
    const { findByTestId } = renderMoneyHomeMfa();

    expect(await findByTestId(MoneyMfaTestIds.HEADER_BADGE)).toBeOnTheScreen();
    await waitFor(() =>
      expect(moneyMfaStore.getState().hasUnseenEnabledConfirmation).toBe(false),
    );
  });
});
