import '../../../../../../tests/component-view/mocks';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderMoneyHomeVbaCard } from '../../../../../../tests/component-view/renderers/moneyHome';
import {
  VBA_TEST_MUSD_ON_MONAD,
  VBA_TEST_USDC_ON_ETHEREUM,
  vbaTestBrlAbilities,
} from '../../../../../../tests/component-view/presets/vba';
import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  type VbaOnboardingSnapshot,
} from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import { KycRejectedSelectorsIDs } from '../../../KYC/Views/Status/KycRejected';
import { KycSumSubSelectorsIDs } from '../../../KYC/Views/SumSub/SumSubKyc';
import { MONEY_VBA_HOME_CARD_TEST_IDS } from '../../components/MoneyVbaHomeCard/MoneyVbaHomeCard.testIds';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

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

const rampsController = Engine.context.RampsController as unknown as {
  refreshCustomerAbilities?: jest.Mock;
};

// Publishes RampsController state the way an Engine state change reaches Redux.
const setRampsControllerState = (
  store: ReturnType<typeof renderMoneyHomeVbaCard>['store'],
  patch: Record<string, unknown>,
): void => {
  const engineWithState = Engine as unknown as {
    state: Record<string, unknown>;
  };
  engineWithState.state = {
    ...engineWithState.state,
    RampsController: {
      ...store.getState().engine.backgroundState.RampsController,
      ...patch,
    },
  };
  store.dispatch(updateBgState({ key: 'RampsController' }));
};

describeForPlatforms('MoneyHomeView Identity verified card', () => {
  beforeEach(() => {
    // The abilities fetch is skipped offline, and view tests start offline.
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    rampsController.refreshCustomerAbilities = jest.fn();
  });

  afterEach(() => {
    netInfoMock.__resetMockNetInfo();
    delete rampsController.refreshCustomerAbilities;
  });

  it('shows the Identity verified card when MoonPay offers mUSD', async () => {
    const { findByTestId } = renderMoneyHomeVbaCard('approved', {
      vbaCustomerAbilities: vbaTestBrlAbilities([VBA_TEST_MUSD_ON_MONAD]),
    });

    expect(
      await findByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.identity_verified.TITLE),
    ).toHaveTextContent(strings('money.vba_home_card.identity_verified.title'));
    expect(rampsController.refreshCustomerAbilities).not.toHaveBeenCalled();
  });

  it('hides the Identity verified card once abilities show mUSD is not offered', async () => {
    const view = renderMoneyHomeVbaCard('approved', {
      vbaCustomerAbilities: vbaTestBrlAbilities([VBA_TEST_MUSD_ON_MONAD]),
    });
    expect(
      await view.findByTestId(
        MONEY_VBA_HOME_CARD_TEST_IDS.identity_verified.CONTAINER,
      ),
    ).toBeOnTheScreen();

    act(() => {
      setRampsControllerState(view.store, {
        vbaCustomerAbilities: vbaTestBrlAbilities([VBA_TEST_USDC_ON_ETHEREUM]),
      });
    });

    await waitFor(() => {
      expect(
        view.queryByTestId(
          MONEY_VBA_HOME_CARD_TEST_IDS.identity_verified.CONTAINER,
        ),
      ).not.toBeOnTheScreen();
    });
    expect(rampsController.refreshCustomerAbilities).not.toHaveBeenCalled();
  });

  it('fetches abilities once and holds the card while none are loaded', async () => {
    rampsController.refreshCustomerAbilities = jest
      .fn()
      .mockReturnValue(new Promise(() => undefined));

    const { queryByTestId } = renderMoneyHomeVbaCard('approved');

    await waitFor(() => {
      expect(rampsController.refreshCustomerAbilities).toHaveBeenCalledTimes(1);
    });
    expect(
      queryByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.identity_verified.CONTAINER),
    ).not.toBeOnTheScreen();
  });
});
