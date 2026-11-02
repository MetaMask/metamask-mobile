import { act, renderHook } from '@testing-library/react-native';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  CANCEL_TYPES,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  SUBSCRIPTION_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import Engine from '../../../../core/Engine';
import ReactQueryService from '../../../../core/ReactQueryService';
import { store } from '../../../../store';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountPlusSubscription } from '../../../../selectors/subscriptionController';
import { SUBSCRIPTIONS_QUERY_KEY } from '../../../hooks/useSubscriptions';
import { retryPlusChargeAfterDeposit } from '../utils/retryPlusChargeAfterDeposit';
import { useRetryPlusChargeOnDeposit } from './useRetryPlusChargeOnDeposit';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('../../../../core/ReactQueryService', () => ({
  __esModule: true,
  default: {
    queryClient: {
      invalidateQueries: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('../../../../store', () => ({
  store: { getState: jest.fn() },
}));

jest.mock('../../../../selectors/identity', () => ({
  selectIsSignedIn: jest.fn(),
}));

jest.mock('../../../../selectors/keyringController', () => ({
  selectIsUnlocked: jest.fn(),
}));

jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock('../../../../selectors/subscriptionController', () => ({
  selectMoneyAccountPlusSubscription: jest.fn(),
}));

jest.mock('../utils/retryPlusChargeAfterDeposit', () => ({
  retryPlusChargeAfterDeposit: jest.fn().mockResolvedValue(undefined),
}));

const MONEY_ACCOUNT_ADDRESS =
  '0x1111111111111111111111111111111111111111' as Hex;

const mockSubscribe = Engine.controllerMessenger.subscribe as jest.Mock;
const mockUnsubscribe = Engine.controllerMessenger.unsubscribe as jest.Mock;
const mockGetState = store.getState as jest.Mock;
const mockSelectIsSignedIn = selectIsSignedIn as unknown as jest.Mock;
const mockSelectIsUnlocked = selectIsUnlocked as unknown as jest.Mock;
const mockSelectPrimaryMoneyAccount =
  selectPrimaryMoneyAccount as unknown as jest.Mock;
const mockSelectMoneyAccountPlusSubscription =
  selectMoneyAccountPlusSubscription as unknown as jest.Mock;
const mockRetryPlusChargeAfterDeposit =
  retryPlusChargeAfterDeposit as jest.Mock;
const mockInvalidateQueries = ReactQueryService.queryClient
  .invalidateQueries as jest.Mock;

const subscription: Subscription = {
  id: 'sub-plus',
  products: [
    {
      name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      currency: 'usd',
      unitAmount: 500,
      unitDecimals: 2,
    },
  ],
  currentPeriodStart: '2026-09-12T12:00:00.000Z',
  currentPeriodEnd: '2026-10-12T12:00:00.000Z',
  status: SUBSCRIPTION_STATUSES.paused,
  interval: RECURRING_INTERVALS.month,
  paymentMethod: {
    type: PAYMENT_TYPES.byCrypto,
    crypto: {
      payerAddress: MONEY_ACCOUNT_ADDRESS,
      chainId: '0x279f' as Hex,
      tokenSymbol: 'mUSD',
    },
  },
  billingCycles: 12,
  cancelType: CANCEL_TYPES.ALLOWED_AT_PERIOD_END,
  isEligibleForSupport: true,
};

const makeTx = (overrides: Partial<TransactionMeta> = {}): TransactionMeta =>
  ({
    id: 'tx-1',
    type: TransactionType.membershipSubscription,
    status: TransactionStatus.confirmed,
    time: 0,
    txParams: {},
    ...overrides,
  }) as unknown as TransactionMeta;

const captureSubscribedCallback = () =>
  mockSubscribe.mock.calls[0][1] as (
    tx: TransactionMeta,
  ) => void | Promise<void>;

describe('useRetryPlusChargeOnDeposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({});
    mockSelectIsSignedIn.mockReturnValue(true);
    mockSelectIsUnlocked.mockReturnValue(true);
    mockSelectPrimaryMoneyAccount.mockReturnValue({
      address: MONEY_ACCOUNT_ADDRESS,
    });
    mockSelectMoneyAccountPlusSubscription.mockReturnValue(subscription);
    mockRetryPlusChargeAfterDeposit.mockResolvedValue(undefined);
    mockInvalidateQueries.mockResolvedValue(undefined);
  });

  it('subscribes to TransactionController:transactionConfirmed on mount', () => {
    renderHook(() => useRetryPlusChargeOnDeposit());

    expect(mockSubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionConfirmed',
      expect.any(Function),
    );
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useRetryPlusChargeOnDeposit());
    const subscribedCallback = captureSubscribedCallback();

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionConfirmed',
      subscribedCallback,
    );
  });

  it('retries Plus charge and invalidates subscriptions for a confirmed membership top-up', async () => {
    renderHook(() => useRetryPlusChargeOnDeposit());
    const callback = captureSubscribedCallback();

    await act(async () => {
      await callback(makeTx());
    });

    expect(mockRetryPlusChargeAfterDeposit).toHaveBeenCalledWith(
      subscription,
      MONEY_ACCOUNT_ADDRESS,
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: SUBSCRIPTIONS_QUERY_KEY,
    });
  });

  it('does not retry for a non-deposit transaction', async () => {
    renderHook(() => useRetryPlusChargeOnDeposit());
    const callback = captureSubscribedCallback();

    await act(async () => {
      await callback(makeTx({ type: TransactionType.simpleSend }));
    });

    expect(mockRetryPlusChargeAfterDeposit).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('retries Plus charge for a confirmed money account deposit', async () => {
    renderHook(() => useRetryPlusChargeOnDeposit());
    const callback = captureSubscribedCallback();

    await act(async () => {
      await callback(makeTx({ type: TransactionType.moneyAccountDeposit }));
    });

    expect(mockRetryPlusChargeAfterDeposit).toHaveBeenCalledWith(
      subscription,
      MONEY_ACCOUNT_ADDRESS,
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: SUBSCRIPTIONS_QUERY_KEY,
    });
  });

  it('does not retry when the wallet is locked', async () => {
    mockSelectIsUnlocked.mockReturnValue(false);
    renderHook(() => useRetryPlusChargeOnDeposit());
    const callback = captureSubscribedCallback();

    await act(async () => {
      await callback(makeTx());
    });

    expect(mockRetryPlusChargeAfterDeposit).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('does not retry when the user is signed out', async () => {
    mockSelectIsSignedIn.mockReturnValue(false);
    renderHook(() => useRetryPlusChargeOnDeposit());
    const callback = captureSubscribedCallback();

    await act(async () => {
      await callback(makeTx());
    });

    expect(mockRetryPlusChargeAfterDeposit).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('retries only once when two deposits confirm while a retry is in flight', async () => {
    let resolveFirstRetry: (() => void) | undefined;
    mockRetryPlusChargeAfterDeposit.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveFirstRetry = resolve;
        }),
    );

    renderHook(() => useRetryPlusChargeOnDeposit());
    const callback = captureSubscribedCallback();

    let firstCall: Promise<void> | undefined;
    await act(async () => {
      firstCall = callback(makeTx({ id: 'tx-1' })) as Promise<void>;
    });

    await act(async () => {
      await callback(makeTx({ id: 'tx-2' }));
    });

    expect(mockRetryPlusChargeAfterDeposit).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirstRetry?.();
      await firstCall;
    });

    expect(mockRetryPlusChargeAfterDeposit).toHaveBeenCalledTimes(1);
  });
});
