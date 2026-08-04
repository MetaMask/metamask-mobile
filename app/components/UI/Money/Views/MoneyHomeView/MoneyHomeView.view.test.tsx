import '../../../../../../tests/component-view/mocks';
import { waitFor, within } from '@testing-library/react-native';
import {
  MONEY_ACCOUNT_ADDRESS,
  MONEY_WALLET_ADDRESS,
} from '../../../../../../tests/component-view/presets/money';
import { renderMoneyHomeView } from '../../../../../../tests/component-view/renderers/moneyViewRenderer';
import {
  clearMoneyApiMocks,
  setupMoneyActivityApiMock,
  setupMoneyDataServiceMock,
} from '../../../../../../tests/component-view/api-mocking/money';
import { deepMerge } from '../../../../../../tests/component-view/stateFixture';
import { MoneyBalanceSummaryTestIds } from '../../components/MoneyBalanceSummary/MoneyBalanceSummary.testIds';
import { strings } from '../../../../../../locales/i18n';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';

const FRESH_BALANCE = 1234.56;
const FRESH_BALANCE_TEXT = '$1,234.56';

type Override = Record<string, unknown>;

const balanceAnimationFlag = (enabled: boolean): Override => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          earnMoneyBalanceAnimationEnabled: {
            enabled,
            minimumVersion: '0.0.0',
          },
        },
      },
    },
  },
});

const privacyMode = (enabled: boolean): Override => ({
  engine: {
    backgroundState: {
      PreferencesController: { privacyMode: enabled },
    },
  },
});

const persistedBalance = (address: string, amount: number): Override => ({
  moneyBalance: {
    lastKnownBalance: {
      address,
      value: `$${amount.toFixed(2)}`,
      amount,
      currency: 'usd',
      updatedAt: 1,
    },
  },
});

const pendingUserOp = (): Override => ({
  moneyBalance: { hasPendingUserOp: true },
});

const renderMoneyHome = (overrides: Override[]) =>
  renderMoneyHomeView({
    overrides: overrides.reduce(
      (merged, override) => deepMerge(merged, override),
      {} as Override,
    ) as unknown as DeepPartial<RootState>,
  });

describe('MoneyHomeView balance animation', () => {
  beforeEach(() => {
    setupMoneyActivityApiMock();
    setupMoneyDataServiceMock({ balance: FRESH_BALANCE });
  });

  afterEach(() => {
    clearMoneyApiMocks();
  });

  it('rolls the balance digits up to the fetched figure when the animation flag is on', async () => {
    const { getByTestId, findByTestId } = renderMoneyHome([
      balanceAnimationFlag(true),
    ]);

    const balance = await findByTestId(MoneyBalanceSummaryTestIds.BALANCE);

    expect(
      within(balance).getByLabelText(FRESH_BALANCE_TEXT),
    ).toBeOnTheScreen();
    const apy = getByTestId(MoneyBalanceSummaryTestIds.APY);
    expect(
      within(apy).getByText(strings('money.apy_label', { percentage: 5 })),
    ).toBeOnTheScreen();
    expect(
      within(apy).getByText(strings('money.apy_currency_suffix')),
    ).toBeOnTheScreen();
  });

  it('renders the fetched figure as static text when the animation flag is off', async () => {
    const { findByTestId } = renderMoneyHome([balanceAnimationFlag(false)]);

    const balance = await findByTestId(MoneyBalanceSummaryTestIds.BALANCE);

    expect(balance).toHaveTextContent(FRESH_BALANCE_TEXT);
    expect(
      within(balance).queryByLabelText(FRESH_BALANCE_TEXT),
    ).not.toBeOnTheScreen();
  });

  it('masks the balance as static text in privacy mode even with the animation flag on', async () => {
    const { findByTestId } = renderMoneyHome([
      balanceAnimationFlag(true),
      privacyMode(true),
    ]);

    const balance = await findByTestId(MoneyBalanceSummaryTestIds.BALANCE);

    expect(balance).toHaveTextContent('•'.repeat(12));
    expect(
      within(balance).queryByLabelText(FRESH_BALANCE_TEXT),
    ).not.toBeOnTheScreen();
  });

  it('shows the persisted balance for this account until the fetched figure lands', async () => {
    const { getByTestId, findByTestId } = renderMoneyHome([
      balanceAnimationFlag(true),
      persistedBalance(MONEY_ACCOUNT_ADDRESS, 100),
    ]);

    expect(
      getByTestId(MoneyBalanceSummaryTestIds.BALANCE_UNAVAILABLE),
    ).toHaveTextContent('$100.00');

    const balance = await findByTestId(MoneyBalanceSummaryTestIds.BALANCE);
    expect(
      within(balance).getByLabelText(FRESH_BALANCE_TEXT),
    ).toBeOnTheScreen();
  });

  it('ignores a persisted balance belonging to another account', async () => {
    const { getByTestId, findByTestId } = renderMoneyHome([
      balanceAnimationFlag(true),
      persistedBalance(MONEY_WALLET_ADDRESS, 100),
    ]);

    expect(
      getByTestId(MoneyBalanceSummaryTestIds.BALANCE_UNAVAILABLE),
    ).toHaveTextContent(strings('money.balance_unavailable_value'));

    const balance = await findByTestId(MoneyBalanceSummaryTestIds.BALANCE);
    expect(
      within(balance).getByLabelText(FRESH_BALANCE_TEXT),
    ).toBeOnTheScreen();
  });

  it('clears the pending user operation once the changed balance is rendered', async () => {
    const { findByTestId, store } = renderMoneyHome([
      balanceAnimationFlag(true),
      persistedBalance(MONEY_ACCOUNT_ADDRESS, 100),
      pendingUserOp(),
    ]);

    const balance = await findByTestId(MoneyBalanceSummaryTestIds.BALANCE);

    expect(
      within(balance).getByLabelText(FRESH_BALANCE_TEXT),
    ).toBeOnTheScreen();
    await waitFor(() =>
      expect(store.getState().moneyBalance.hasPendingUserOp).toBe(false),
    );
  });
});
