import '../../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  renderMoneyHomeVbaCard,
  restoreMoneyHomeTestState,
} from '../../../../../../tests/component-view/renderers/moneyHome';
import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  type VbaOnboardingSnapshot,
} from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import { KycRejectedSelectorsIDs } from '../../../KYC/Views/Status/KycRejected';
import { MONEY_VBA_HOME_CARD_TEST_IDS } from '../../components/MoneyVbaHomeCard/MoneyVbaHomeCard.testIds';

// Hydrate, then the root stack resets onto the VBA onboarding navigator.
const ONBOARDING_TIMEOUT_MS = 5000;

const hydrateVbaOnboarding = Engine.context.RampsController
  .hydrateVbaOnboarding as jest.Mock;
const defaultHydrateVbaOnboarding =
  hydrateVbaOnboarding.getMockImplementation();

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
  });

  afterEach(() => {
    restoreMoneyHomeTestState();
    hydrateVbaOnboarding.mockReset();
    hydrateVbaOnboarding.mockImplementation(defaultHydrateVbaOnboarding);
  });

  it('opens the retry screen from Continue verification when KYC finalStatus is retry', async () => {
    hydrateVbaOnboarding.mockResolvedValue(hydratedSnapshot('retry'));

    const { findByTestId, getByTestId, queryByTestId } =
      renderMoneyHomeVbaCard('retry');

    const retryCard = await findByTestId(
      MONEY_VBA_HOME_CARD_TEST_IDS.kyc_retry.CONTAINER,
    );

    expect(retryCard).toBeOnTheScreen();
    expect(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_retry.TITLE),
    ).toHaveTextContent(strings('money.vba_home_card.kyc_retry.title'));
    expect(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_retry.DESCRIPTION),
    ).toHaveTextContent(strings('money.vba_home_card.kyc_retry.description'));
    expect(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_retry.CTA_BUTTON),
    ).toHaveTextContent(strings('money.vba_home_card.kyc_retry.cta'));
    expect(
      queryByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_decision.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(
        MONEY_VBA_HOME_CARD_TEST_IDS.kyc_decision.DISMISS_BUTTON as string,
      ),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_retry.CTA_BUTTON),
    );

    expect(
      await findByTestId(
        KycRejectedSelectorsIDs.RETRY_BUTTON,
        {},
        { timeout: ONBOARDING_TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(KycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON),
    ).not.toBeOnTheScreen();
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
