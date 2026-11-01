import '../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import en from '../../../../../../locales/languages/en.json';
import Engine from '../../../../../core/Engine';
import {
  clearAccountsTransactionsApiMocks,
  setupV1AccountTransactionsApiMock,
} from '../../../../../../tests/component-view/api-mocking/accounts-transactions';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  renderVbaMoneyHome,
  restoreVbaReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vba';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import { VbaIdentityVerifiedSelectorsIDs } from '../../../KYC/Views/Status/IdentityVerified';
import { MONEY_VBA_HOME_CARD_TEST_IDS } from '../../components/MoneyVbaHomeCard/MoneyVbaHomeCard.testIds';
import { MoneyHowItWorksTestIds } from '../../components/MoneyHowItWorks/MoneyHowItWorks.testIds';
import { MoneyActivityListTestIds } from '../../components/MoneyActivityList/MoneyActivityList.testIds';
import { MoneyActivityLoadingTestIds } from '../../components/MoneyActivityLoading/MoneyActivityLoading.testIds';

const englishCard = en.money.vba_home_card.account_is_ready;

const APPROVED_SESSION = {
  id: 'session-1',
  externalUserId: 'user-1',
  vendor: 'sumsub',
  vendorStatus: 'completed',
  finalStatus: 'approved',
  kycStatus: 'approved',
};

const engineCall = Engine.controllerMessenger.call as jest.Mock;
const mockHydrateVbaOnboarding = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);
const kycController = Engine.context.KycController as {
  state?: { sessionStatus: null };
};

const homeOverrides = (): DeepPartial<RootState> =>
  ({
    user: {
      onboardingStepperProgress: {
        'money-home-onboarding-stepper': 2,
      },
    },
    engine: {
      backgroundState: {
        KycController: {
          sessionStatus: APPROVED_SESSION,
          providerFlowStatus: 'submitted',
        },
        PreferencesController: {
          tokenSortConfig: {
            key: 'tokenFiatAmount',
            order: 'dsc',
            sortCallback: 'stringNumeric',
          },
        },
      },
    },
  }) as unknown as DeepPartial<RootState>;

const installMoneyHomeEngine = () => {
  const previous = engineCall.getMockImplementation();
  engineCall.mockImplementation((action: string, ...args: unknown[]) => {
    if (action === 'MoneyAccountBalanceService:fetchBalanceWithFallback') {
      return Promise.resolve({
        musdBalance: '0',
        vmusdValueInMusd: '0',
        totalBalance: '0',
        source: 'api',
        usedFallback: false,
      });
    }
    if (action === 'MoneyAccountApiDataService:fetchInterest') {
      return Promise.resolve({ interest_earned_usd: '0' });
    }
    if (action === 'MoneyAccountBalanceService:getVaultApy') {
      return Promise.resolve({ apy: '0.042' });
    }
    if (previous) {
      return previous(action, ...args);
    }
    return Promise.resolve(undefined);
  });
  return () => {
    engineCall.mockImplementation(
      previous ?? (() => Promise.resolve(undefined)),
    );
  };
};

describeForPlatforms('Money home VBA card view', () => {
  let restoreEngine: (() => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    kycController.state = { sessionStatus: null };
    setupV1AccountTransactionsApiMock();
    mockHydrateVbaOnboarding.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'submitted',
      kycStatus: 'approved',
      autorampStatus: 'not_ready',
    });
  });

  afterEach(() => {
    restoreEngine?.();
    restoreEngine = undefined;
    clearAccountsTransactionsApiMocks();
    restoreVbaReduxServiceStore();
  });

  it('shows the account-ready card for a KYC-approved user with zero balance', async () => {
    restoreEngine = installMoneyHomeEngine();
    const { findByTestId, getByTestId, queryByTestId } = renderVbaMoneyHome({
      overrides: homeOverrides(),
    });
    const card = MONEY_VBA_HOME_CARD_TEST_IDS.account_is_ready;

    expect(await findByTestId(card.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(card.TITLE)).toHaveTextContent(
      strings('money.vba_home_card.account_is_ready.title'),
    );
    expect(getByTestId(card.DESCRIPTION)).toHaveTextContent(
      strings('money.vba_home_card.account_is_ready.description'),
    );
    expect(getByTestId(card.CTA_BUTTON)).toHaveTextContent(
      strings('money.vba_home_card.account_is_ready.cta'),
    );
    expect(
      await findByTestId(MoneyHowItWorksTestIds.CONTAINER),
    ).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        queryByTestId(MoneyActivityLoadingTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });
    expect(
      queryByTestId(MoneyActivityListTestIds.CONTAINER),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(card.CTA_BUTTON));

    expect(
      await findByTestId(VbaIdentityVerifiedSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(queryByTestId(card.CONTAINER)).not.toBeOnTheScreen();
  });

  it('does not render the English source for the account-ready card in Portuguese', async () => {
    const previousLocale = I18n.locale;
    I18n.locale = 'pt';
    restoreEngine = installMoneyHomeEngine();

    try {
      const { findByTestId, getByTestId, queryAllByText } = renderVbaMoneyHome({
        overrides: homeOverrides(),
      });
      const card = MONEY_VBA_HOME_CARD_TEST_IDS.account_is_ready;

      expect(await findByTestId(card.TITLE)).toBeOnTheScreen();
      expect(getByTestId(card.TITLE)).not.toHaveTextContent(
        /\[missing|money\.vba_home_card\./i,
      );
      expect(queryAllByText(englishCard.title)).toHaveLength(0);
      expect(queryAllByText(englishCard.description)).toHaveLength(0);
      expect(queryAllByText(englishCard.cta)).toHaveLength(0);
      expect(getByTestId(card.TITLE)).toHaveTextContent(/\S/);
    } finally {
      I18n.locale = previousLocale;
    }
  });
});
