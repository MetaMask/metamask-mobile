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
import ReduxService from '../../../../redux';
import { selectIsSignedIn } from '../../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { selectMoneyAccountPlusSubscription } from '../../../../../selectors/subscriptionController';
import { retrySubscriptionChargeAfterDeposit } from '../retry-subscription-charge-after-deposit';
import Engine from '../../../../Engine';
import {
  handleTransactionConfirmedForSubscriptionChargeRetry,
  handleUnlockForSubscriptionChargeRetry,
} from './subscription-charge-retry';

jest.mock('../../../../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      SubscriptionController: {
        getSubscriptions: jest.fn().mockResolvedValue([]),
      },
    },
  },
}));

jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(() => ({})),
    },
  },
}));

jest.mock('../../../../../selectors/identity', () => ({
  selectIsSignedIn: jest.fn(),
}));

jest.mock('../../../../../selectors/keyringController', () => ({
  selectIsUnlocked: jest.fn(),
}));

jest.mock('../../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock('../../../../../selectors/subscriptionController', () => ({
  selectMoneyAccountPlusSubscription: jest.fn(),
}));

jest.mock('../retry-subscription-charge-after-deposit', () => ({
  retrySubscriptionChargeAfterDeposit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const MONEY_ACCOUNT_ADDRESS =
  '0x1111111111111111111111111111111111111111' as Hex;

const mockSelectIsSignedIn = selectIsSignedIn as unknown as jest.Mock;
const mockSelectIsUnlocked = selectIsUnlocked as unknown as jest.Mock;
const mockSelectPrimaryMoneyAccount =
  selectPrimaryMoneyAccount as unknown as jest.Mock;
const mockSelectMoneyAccountPlusSubscription =
  selectMoneyAccountPlusSubscription as unknown as jest.Mock;
const mockRetrySubscriptionChargeAfterDeposit =
  retrySubscriptionChargeAfterDeposit as jest.Mock;
const mockGetSubscriptions = Engine.context.SubscriptionController
  .getSubscriptions as jest.Mock;

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

describe('handleTransactionConfirmedForSubscriptionChargeRetry', () => {
  beforeEach(async () => {
    mockSelectIsSignedIn.mockReturnValue(false);
    await handleUnlockForSubscriptionChargeRetry();
    jest.clearAllMocks();
    mockSelectIsSignedIn.mockReturnValue(true);
    mockSelectIsUnlocked.mockReturnValue(true);
    mockSelectPrimaryMoneyAccount.mockReturnValue({
      address: MONEY_ACCOUNT_ADDRESS,
    });
    mockSelectMoneyAccountPlusSubscription.mockReturnValue(subscription);
    mockRetrySubscriptionChargeAfterDeposit.mockResolvedValue(undefined);
    mockGetSubscriptions.mockResolvedValue([]);
  });

  it('retries the subscription charge for a confirmed membership top-up', async () => {
    await handleTransactionConfirmedForSubscriptionChargeRetry(
      makeTx({ blockNumber: '0x10' }),
    );

    expect(ReduxService.store.getState).toHaveBeenCalled();
    expect(mockRetrySubscriptionChargeAfterDeposit).toHaveBeenCalledWith(
      subscription,
      MONEY_ACCOUNT_ADDRESS,
      16,
    );
    expect(mockGetSubscriptions).toHaveBeenCalledTimes(1);
  });

  it('retries the subscription charge for a confirmed money account deposit', async () => {
    await handleTransactionConfirmedForSubscriptionChargeRetry(
      makeTx({ type: TransactionType.moneyAccountDeposit }),
    );

    expect(mockRetrySubscriptionChargeAfterDeposit).toHaveBeenCalledWith(
      subscription,
      MONEY_ACCOUNT_ADDRESS,
      undefined,
    );
  });

  it('does not retry for a non-deposit transaction', async () => {
    await handleTransactionConfirmedForSubscriptionChargeRetry(
      makeTx({ type: TransactionType.simpleSend }),
    );

    expect(mockRetrySubscriptionChargeAfterDeposit).not.toHaveBeenCalled();
    expect(mockGetSubscriptions).not.toHaveBeenCalled();
  });

  it('does not retry when the wallet is locked', async () => {
    mockSelectIsUnlocked.mockReturnValue(false);

    await handleTransactionConfirmedForSubscriptionChargeRetry(makeTx());

    expect(mockRetrySubscriptionChargeAfterDeposit).not.toHaveBeenCalled();
    expect(mockGetSubscriptions).not.toHaveBeenCalled();
  });

  it('retries a deposit that confirmed while locked after unlock', async () => {
    mockSelectIsUnlocked.mockReturnValue(false);

    await handleTransactionConfirmedForSubscriptionChargeRetry(
      makeTx({ blockNumber: '0x10' }),
    );

    mockSelectIsUnlocked.mockReturnValue(true);
    await handleUnlockForSubscriptionChargeRetry();

    expect(mockRetrySubscriptionChargeAfterDeposit).toHaveBeenCalledTimes(1);
    expect(mockRetrySubscriptionChargeAfterDeposit).toHaveBeenCalledWith(
      subscription,
      MONEY_ACCOUNT_ADDRESS,
      16,
    );
    expect(mockGetSubscriptions).toHaveBeenCalledTimes(1);
  });

  it('retries with the later block when two deposits confirm while locked', async () => {
    mockSelectIsUnlocked.mockReturnValue(false);

    await handleTransactionConfirmedForSubscriptionChargeRetry(
      makeTx({ id: 'tx-1', blockNumber: '0x10' }),
    );
    await handleTransactionConfirmedForSubscriptionChargeRetry(
      makeTx({ id: 'tx-2', blockNumber: '0x20' }),
    );

    mockSelectIsUnlocked.mockReturnValue(true);
    await handleUnlockForSubscriptionChargeRetry();

    expect(mockRetrySubscriptionChargeAfterDeposit).toHaveBeenCalledTimes(1);
    expect(mockRetrySubscriptionChargeAfterDeposit).toHaveBeenCalledWith(
      subscription,
      MONEY_ACCOUNT_ADDRESS,
      32,
    );
  });

  it('retries a locked deposit after the in-flight retry finishes', async () => {
    let resolveFirstRetry: (() => void) | undefined;
    mockRetrySubscriptionChargeAfterDeposit.mockImplementation(() => {
      if (mockRetrySubscriptionChargeAfterDeposit.mock.calls.length > 1) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        resolveFirstRetry = resolve;
      });
    });

    const firstCall = handleTransactionConfirmedForSubscriptionChargeRetry(
      makeTx({ id: 'tx-1' }),
    );
    await Promise.resolve();

    mockSelectIsUnlocked.mockReturnValue(false);
    await handleTransactionConfirmedForSubscriptionChargeRetry(
      makeTx({ id: 'tx-2', blockNumber: '0x20' }),
    );

    mockSelectIsUnlocked.mockReturnValue(true);
    await handleUnlockForSubscriptionChargeRetry();

    expect(mockRetrySubscriptionChargeAfterDeposit).toHaveBeenCalledTimes(1);

    resolveFirstRetry?.();
    await firstCall;

    expect(mockRetrySubscriptionChargeAfterDeposit).toHaveBeenCalledTimes(2);
    expect(mockRetrySubscriptionChargeAfterDeposit).toHaveBeenLastCalledWith(
      subscription,
      MONEY_ACCOUNT_ADDRESS,
      32,
    );
  });

  it('drops a deposit that confirmed while signed out', async () => {
    mockSelectIsUnlocked.mockReturnValue(false);
    mockSelectIsSignedIn.mockReturnValue(false);

    await handleTransactionConfirmedForSubscriptionChargeRetry(makeTx());

    mockSelectIsUnlocked.mockReturnValue(true);
    mockSelectIsSignedIn.mockReturnValue(true);
    await handleUnlockForSubscriptionChargeRetry();

    expect(mockRetrySubscriptionChargeAfterDeposit).not.toHaveBeenCalled();
    expect(mockGetSubscriptions).not.toHaveBeenCalled();
  });

  it('does not retry when the user is signed out', async () => {
    mockSelectIsSignedIn.mockReturnValue(false);

    await handleTransactionConfirmedForSubscriptionChargeRetry(makeTx());

    expect(mockRetrySubscriptionChargeAfterDeposit).not.toHaveBeenCalled();
    expect(mockGetSubscriptions).not.toHaveBeenCalled();
  });

  it('retries only once when two deposits confirm while a retry is in flight', async () => {
    let resolveFirstRetry: (() => void) | undefined;
    mockRetrySubscriptionChargeAfterDeposit.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveFirstRetry = resolve;
        }),
    );

    const firstCall = handleTransactionConfirmedForSubscriptionChargeRetry(
      makeTx({ id: 'tx-1' }),
    );
    await Promise.resolve();

    await handleTransactionConfirmedForSubscriptionChargeRetry(
      makeTx({ id: 'tx-2' }),
    );

    expect(mockRetrySubscriptionChargeAfterDeposit).toHaveBeenCalledTimes(1);

    resolveFirstRetry?.();
    await firstCall;

    expect(mockRetrySubscriptionChargeAfterDeposit).toHaveBeenCalledTimes(1);
  });

  it('retries a later deposit after an earlier retry fails', async () => {
    mockRetrySubscriptionChargeAfterDeposit.mockRejectedValueOnce(
      new Error('refresh failed'),
    );

    await handleTransactionConfirmedForSubscriptionChargeRetry(
      makeTx({ id: 'tx-1' }),
    );
    await handleTransactionConfirmedForSubscriptionChargeRetry(
      makeTx({ id: 'tx-2' }),
    );

    expect(mockRetrySubscriptionChargeAfterDeposit).toHaveBeenCalledTimes(2);
  });

  it('refreshes subscriptions when a later deposit follows a failed refresh', async () => {
    mockGetSubscriptions.mockRejectedValueOnce(new Error('refresh failed'));

    await handleTransactionConfirmedForSubscriptionChargeRetry(
      makeTx({ id: 'tx-1' }),
    );
    await handleTransactionConfirmedForSubscriptionChargeRetry(
      makeTx({ id: 'tx-2' }),
    );

    expect(mockRetrySubscriptionChargeAfterDeposit).toHaveBeenCalledTimes(2);
    expect(mockGetSubscriptions).toHaveBeenCalledTimes(2);
  });
});
