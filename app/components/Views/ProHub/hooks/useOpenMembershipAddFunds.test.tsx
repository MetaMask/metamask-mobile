import { act, renderHook } from '@testing-library/react-native';
import {
  CANCEL_TYPES,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  SUBSCRIPTION_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import { TransactionType } from '@metamask/transaction-controller';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { MoneyAccountAccessBlockedError } from '../../../UI/Money/utils/moneyAccountAccess';
import { useOpenMembershipAddFunds } from './useOpenMembershipAddFunds';

const mockNavigate = jest.fn();
const mockInitiateDeposit = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, isFocused: () => true }),
}));

jest.mock('../../../UI/Money/hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: () => ({ initiateDeposit: mockInitiateDeposit }),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      SubscriptionDelegationService: { checkMoneyAccountBalance: jest.fn() },
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const checkBalance = jest.mocked(
  Engine.context.SubscriptionDelegationService.checkMoneyAccountBalance,
);
const payerAddress = '0x1111111111111111111111111111111111111111';
const subscription: Subscription = {
  id: 'sub-plus',
  products: [],
  currentPeriodStart: '2026-10-01T00:00:00Z',
  currentPeriodEnd: '2026-11-01T00:00:00Z',
  status: SUBSCRIPTION_STATUSES.unpaid,
  interval: RECURRING_INTERVALS.month,
  paymentMethod: {
    type: PAYMENT_TYPES.byCrypto,
    crypto: { payerAddress, chainId: '0x1', tokenSymbol: 'mUSD' },
  },
  cancelType: CANCEL_TYPES.ALLOWED_AT_PERIOD_END,
  isEligibleForSupport: true,
};
const shortfall = {
  hasSufficientBalance: false,
  balance: '4989989',
  requiredBalance: '4990000',
};
const sheet = { screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET };

describe('useOpenMembershipAddFunds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkBalance.mockReset();
    mockInitiateDeposit.mockResolvedValue(undefined);
  });

  it('checks the subscription payer and opens a membership top-up for the rounded-up shortfall', async () => {
    checkBalance.mockResolvedValue(shortfall);
    const { result } = renderHook(useOpenMembershipAddFunds);

    await act(async () => result.current.openAddFunds(subscription));

    expect(checkBalance).toHaveBeenCalledWith({
      product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      recurringInterval: subscription.interval,
      payerAddress,
    });
    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      amount: '0.01',
      transactionType: TransactionType.membershipSubscription,
      forceBottomSheet: true,
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows the access notice when Money access is blocked', async () => {
    checkBalance.mockResolvedValue(shortfall);
    mockInitiateDeposit.mockRejectedValue(
      new MoneyAccountAccessBlockedError('geo_blocked'),
    );
    const { result } = renderHook(useOpenMembershipAddFunds);

    await act(async () => result.current.openAddFunds(subscription));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
    });
  });

  it('opens the generic sheet when the balance covers the charge', async () => {
    checkBalance.mockResolvedValue({
      ...shortfall,
      balance: '4990000',
      hasSufficientBalance: true,
    });
    const { result } = renderHook(useOpenMembershipAddFunds);

    await act(async () => result.current.openAddFunds(subscription));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, sheet);
  });

  it('skips the balance check when there is no subscription', async () => {
    const { result } = renderHook(useOpenMembershipAddFunds);

    await act(async () => result.current.openAddFunds(undefined));

    expect(checkBalance).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, sheet);
  });

  it('logs a failed check and still opens the generic sheet', async () => {
    const error = new Error('Balance unavailable');
    checkBalance.mockRejectedValue(error);
    const { result } = renderHook(useOpenMembershipAddFunds);

    await act(async () => result.current.openAddFunds(subscription));

    expect(Logger.error).toHaveBeenCalledWith(error);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, sheet);
  });

  it('stays busy and ignores a second tap until the top-up finishes opening', async () => {
    checkBalance.mockResolvedValue(shortfall);
    let resolveDeposit: () => void = () => undefined;
    mockInitiateDeposit.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDeposit = resolve;
      }),
    );
    const { result } = renderHook(useOpenMembershipAddFunds);
    let opening: Promise<void> | undefined;

    await act(async () => {
      opening = result.current.openAddFunds(subscription);
    });
    await act(async () => result.current.openAddFunds(subscription));

    expect(result.current.isCheckingBalance).toBe(true);
    expect(checkBalance).toHaveBeenCalledTimes(1);
    expect(mockInitiateDeposit).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDeposit();
      await opening;
    });

    expect(result.current.isCheckingBalance).toBe(false);
  });

  it('ignores a second tap during the check and does not navigate after unmount', async () => {
    let resolveBalance: (balance: typeof shortfall) => void = () => undefined;
    checkBalance.mockReturnValue(
      new Promise((resolve) => {
        resolveBalance = resolve;
      }),
    );
    const { result, unmount } = renderHook(useOpenMembershipAddFunds);
    let opening: Promise<void> | undefined;

    act(() => {
      opening = result.current.openAddFunds(subscription);
      void result.current.openAddFunds(subscription);
    });

    expect(result.current.isCheckingBalance).toBe(true);
    expect(checkBalance).toHaveBeenCalledTimes(1);

    unmount();
    resolveBalance(shortfall);
    await opening;

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });
});
