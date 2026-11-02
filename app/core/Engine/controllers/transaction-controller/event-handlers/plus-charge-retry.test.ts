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
import { retryPlusChargeAfterDeposit } from '../../../../../components/Views/ProHub/utils/retryPlusChargeAfterDeposit';
import { handleTransactionConfirmedForPlusChargeRetry } from './plus-charge-retry';

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

jest.mock(
  '../../../../../components/Views/ProHub/utils/retryPlusChargeAfterDeposit',
  () => ({
    retryPlusChargeAfterDeposit: jest.fn().mockResolvedValue(undefined),
  }),
);

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
const mockRetryPlusChargeAfterDeposit =
  retryPlusChargeAfterDeposit as jest.Mock;

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

describe('handleTransactionConfirmedForPlusChargeRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectIsSignedIn.mockReturnValue(true);
    mockSelectIsUnlocked.mockReturnValue(true);
    mockSelectPrimaryMoneyAccount.mockReturnValue({
      address: MONEY_ACCOUNT_ADDRESS,
    });
    mockSelectMoneyAccountPlusSubscription.mockReturnValue(subscription);
    mockRetryPlusChargeAfterDeposit.mockResolvedValue(undefined);
  });

  it('retries the Plus charge for a confirmed membership top-up', async () => {
    await handleTransactionConfirmedForPlusChargeRetry(
      makeTx({ blockNumber: '0x10' }),
    );

    expect(ReduxService.store.getState).toHaveBeenCalled();
    expect(mockRetryPlusChargeAfterDeposit).toHaveBeenCalledWith(
      subscription,
      MONEY_ACCOUNT_ADDRESS,
      16,
    );
  });

  it('retries the Plus charge for a confirmed money account deposit', async () => {
    await handleTransactionConfirmedForPlusChargeRetry(
      makeTx({ type: TransactionType.moneyAccountDeposit }),
    );

    expect(mockRetryPlusChargeAfterDeposit).toHaveBeenCalledWith(
      subscription,
      MONEY_ACCOUNT_ADDRESS,
      undefined,
    );
  });

  it('does not retry for a non-deposit transaction', async () => {
    await handleTransactionConfirmedForPlusChargeRetry(
      makeTx({ type: TransactionType.simpleSend }),
    );

    expect(mockRetryPlusChargeAfterDeposit).not.toHaveBeenCalled();
  });

  it('does not retry when the wallet is locked', async () => {
    mockSelectIsUnlocked.mockReturnValue(false);

    await handleTransactionConfirmedForPlusChargeRetry(makeTx());

    expect(mockRetryPlusChargeAfterDeposit).not.toHaveBeenCalled();
  });

  it('does not retry when the user is signed out', async () => {
    mockSelectIsSignedIn.mockReturnValue(false);

    await handleTransactionConfirmedForPlusChargeRetry(makeTx());

    expect(mockRetryPlusChargeAfterDeposit).not.toHaveBeenCalled();
  });

  it('retries only once when two deposits confirm while a retry is in flight', async () => {
    let resolveFirstRetry: (() => void) | undefined;
    mockRetryPlusChargeAfterDeposit.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveFirstRetry = resolve;
        }),
    );

    const firstCall = handleTransactionConfirmedForPlusChargeRetry(
      makeTx({ id: 'tx-1' }),
    );
    await Promise.resolve();

    await handleTransactionConfirmedForPlusChargeRetry(makeTx({ id: 'tx-2' }));

    expect(mockRetryPlusChargeAfterDeposit).toHaveBeenCalledTimes(1);

    resolveFirstRetry?.();
    await firstCall;

    expect(mockRetryPlusChargeAfterDeposit).toHaveBeenCalledTimes(1);
  });

  it('retries a later deposit after an earlier retry fails', async () => {
    mockRetryPlusChargeAfterDeposit.mockRejectedValueOnce(
      new Error('refresh failed'),
    );

    await handleTransactionConfirmedForPlusChargeRetry(makeTx({ id: 'tx-1' }));
    await handleTransactionConfirmedForPlusChargeRetry(makeTx({ id: 'tx-2' }));

    expect(mockRetryPlusChargeAfterDeposit).toHaveBeenCalledTimes(2);
  });
});
