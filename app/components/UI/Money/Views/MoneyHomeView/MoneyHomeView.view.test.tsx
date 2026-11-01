import '../../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { apiClient } from '../../../../../core/apiClient';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { VBA_TEST_MONEY_ADDRESS } from '../../../../../../tests/component-view/presets/vba';
import {
  renderVbaMoneyHome,
  restoreVbaReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vba';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import { VbaOnboardingLoadingSelectorsIDs } from '../../../Ramp/Views/VirtualBankAccount/VbaOnboardingLoading';
import { MONEY_VBA_HOME_CARD_TEST_IDS } from '../../components/MoneyVbaHomeCard/MoneyVbaHomeCard.testIds';
import { MoneyHowItWorksTestIds } from '../../components/MoneyHowItWorks/MoneyHowItWorks.testIds';
import { MoneyActivityListTestIds } from '../../components/MoneyActivityList/MoneyActivityList.testIds';
import { MoneyActivityLoadingTestIds } from '../../components/MoneyActivityLoading/MoneyActivityLoading.testIds';
import { MoneyActivityItemTestIds } from '../../components/MoneyActivityItem/MoneyActivityItem.testIds';

const UNRESOLVED_COPY = /\[missing|money\.vba_home_card\./iu;
const PENDING_TRANSFER_ID = 'vba-transfer-1';

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

const pendingTransfer = {
  transfer_id: PENDING_TRANSFER_ID,
  event_timestamp: '2026-10-01T12:00:00.000Z',
  status: 'processing',
  transfer: {
    recipient_address: VBA_TEST_MONEY_ADDRESS,
    asset: 'musd',
    amount: '25.00',
    network: 'monad',
  },
};

const homeOverrides = (
  pendingActivityEnabled: boolean,
): DeepPartial<RootState> =>
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
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            moneyVbaPendingActivityEnabled: {
              enabled: pendingActivityEnabled,
              minimumVersion: '0.0.0',
            },
            moneyVbaCompletedActivityEnabled: {
              enabled: false,
              minimumVersion: '0.0.0',
            },
          },
        },
      },
    },
  }) as unknown as DeepPartial<RootState>;

const expectResolvedCopy = (value: string) => {
  expect(value).not.toMatch(UNRESOLVED_COPY);
};

const installMoneyHomeEngine = (transfers: unknown[]) => {
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
    if (action === 'MoneyAccountApiDataService:fetchVbaTransfers') {
      return Promise.resolve({ transfers });
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
  let fetchTransactions: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    kycController.state = { sessionStatus: null };
    mockHydrateVbaOnboarding.mockImplementation(
      () => new Promise(() => undefined),
    );
    fetchTransactions = jest
      .spyOn(apiClient.accounts, 'fetchV1AccountTransactions')
      .mockResolvedValue({
        data: [],
        pageInfo: { hasNextPage: false },
      } as Awaited<
        ReturnType<typeof apiClient.accounts.fetchV1AccountTransactions>
      >);
  });

  afterEach(() => {
    restoreEngine?.();
    restoreEngine = undefined;
    fetchTransactions.mockRestore();
    restoreVbaReduxServiceStore();
  });

  it('shows the account-ready card on an empty first-deposit home', async () => {
    restoreEngine = installMoneyHomeEngine([]);
    const { findByTestId, getByTestId, queryByTestId } = renderVbaMoneyHome({
      overrides: homeOverrides(false),
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
    expect(
      queryByTestId(MoneyActivityListTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyActivityLoadingTestIds.CONTAINER),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(card.CTA_BUTTON));

    expect(
      await findByTestId(VbaOnboardingLoadingSelectorsIDs.SPINNER),
    ).toBeOnTheScreen();
  });

  it('keeps the account-ready card beside a pending VBA deposit', async () => {
    restoreEngine = installMoneyHomeEngine([pendingTransfer]);
    const { findByTestId, getByTestId, queryByTestId } = renderVbaMoneyHome({
      overrides: homeOverrides(true),
    });
    const card = MONEY_VBA_HOME_CARD_TEST_IDS.account_is_ready;

    expect(await findByTestId(card.CONTAINER)).toBeOnTheScreen();
    expect(
      await findByTestId(
        `${MoneyActivityItemTestIds.ROW}-${PENDING_TRANSFER_ID}`,
      ),
    ).toBeOnTheScreen();
    expect(getByTestId(MoneyActivityListTestIds.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(MoneyActivityItemTestIds.LABEL)).toHaveTextContent(
      strings('money.transaction.depositing'),
    );
    expect(
      queryByTestId(MoneyHowItWorksTestIds.CONTAINER),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(card.CTA_BUTTON));

    expect(
      await findByTestId(VbaOnboardingLoadingSelectorsIDs.SPINNER),
    ).toBeOnTheScreen();
  });

  it('renders the VBA card in Portuguese (pt) with resolved copy', async () => {
    const previousLocale = I18n.locale;
    I18n.locale = 'pt';
    restoreEngine = installMoneyHomeEngine([]);

    try {
      const { findByTestId, getByTestId } = renderVbaMoneyHome({
        overrides: homeOverrides(false),
      });
      const card = MONEY_VBA_HOME_CARD_TEST_IDS.account_is_ready;
      const title = strings('money.vba_home_card.account_is_ready.title');
      const description = strings(
        'money.vba_home_card.account_is_ready.description',
      );
      const cta = strings('money.vba_home_card.account_is_ready.cta');

      expect(await findByTestId(card.TITLE)).toBeOnTheScreen();
      expectResolvedCopy(title);
      expectResolvedCopy(description);
      expectResolvedCopy(cta);
      expect(getByTestId(card.TITLE)).toHaveTextContent(title);
      expect(getByTestId(card.DESCRIPTION)).toHaveTextContent(description);
      expect(getByTestId(card.CTA_BUTTON)).toHaveTextContent(cta);
    } finally {
      I18n.locale = previousLocale;
    }
  });

  it.todo(
    'Portuguese copy is pending: Money home VBA card must not keep English source text',
  );
});
