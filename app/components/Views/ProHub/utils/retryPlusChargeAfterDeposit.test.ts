import {
  CANCEL_TYPES,
  CRYPTO_PAYMENT_METHOD_ERRORS,
  INVOICE_PAYMENT_STATUSES,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  SUBSCRIPTION_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import {
  isPlusChargeRetryable,
  retryPlusChargeAfterDeposit,
} from './retryPlusChargeAfterDeposit';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      SubscriptionController: {
        updatePaymentMethod: jest.fn(),
      },
      SubscriptionDelegationService: {
        checkMoneyAccountBalance: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const MONEY_ACCOUNT_ADDRESS =
  '0x1111111111111111111111111111111111111111' as Hex;
const OTHER_ADDRESS = '0x2222222222222222222222222222222222222222' as Hex;
const CHAIN_ID = '0x279f' as Hex;

const mockUpdatePaymentMethod = Engine.context.SubscriptionController
  .updatePaymentMethod as jest.Mock;
const mockCheckMoneyAccountBalance = Engine.context
  .SubscriptionDelegationService.checkMoneyAccountBalance as jest.Mock;

const createCryptoSubscription = (
  overrides: Partial<Subscription> = {},
): Subscription => ({
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
      chainId: CHAIN_ID,
      tokenSymbol: 'mUSD',
    },
  },
  billingCycles: 12,
  cancelType: CANCEL_TYPES.ALLOWED_AT_PERIOD_END,
  isEligibleForSupport: true,
  ...overrides,
});

describe('isPlusChargeRetryable', () => {
  it('returns true for a paused crypto subscription on the Money Account', () => {
    const subscription = createCryptoSubscription();

    expect(isPlusChargeRetryable(subscription, MONEY_ACCOUNT_ADDRESS)).toBe(
      true,
    );
  });

  it('returns true for past_due with a FAILED invoice', () => {
    const subscription = createCryptoSubscription({
      status: SUBSCRIPTION_STATUSES.pastDue,
      lastInvoice: {
        id: 'inv_1',
        status: INVOICE_PAYMENT_STATUSES.FAILED,
      },
    });

    expect(isPlusChargeRetryable(subscription, MONEY_ACCOUNT_ADDRESS)).toBe(
      true,
    );
  });

  it('returns true for active with a crypto error and a FAILED invoice', () => {
    const subscription = createCryptoSubscription({
      status: SUBSCRIPTION_STATUSES.active,
      paymentMethod: {
        type: PAYMENT_TYPES.byCrypto,
        crypto: {
          payerAddress: MONEY_ACCOUNT_ADDRESS,
          chainId: CHAIN_ID,
          tokenSymbol: 'mUSD',
          error: CRYPTO_PAYMENT_METHOD_ERRORS.INSUFFICIENT_BALANCE,
        },
      },
      lastInvoice: {
        id: 'inv_1',
        status: INVOICE_PAYMENT_STATUSES.FAILED,
      },
    });

    expect(isPlusChargeRetryable(subscription, MONEY_ACCOUNT_ADDRESS)).toBe(
      true,
    );
  });

  it('matches the Money Account payer address case-insensitively', () => {
    const subscription = createCryptoSubscription();

    expect(
      isPlusChargeRetryable(subscription, MONEY_ACCOUNT_ADDRESS.toUpperCase()),
    ).toBe(true);
  });

  it.each([
    SUBSCRIPTION_STATUSES.provisional,
    SUBSCRIPTION_STATUSES.awaitingFunds,
    SUBSCRIPTION_STATUSES.canceled,
  ])('returns false for a %s subscription', (status) => {
    const subscription = createCryptoSubscription({ status });

    expect(isPlusChargeRetryable(subscription, MONEY_ACCOUNT_ADDRESS)).toBe(
      false,
    );
  });

  it('returns false when cancelAtPeriodEnd is set', () => {
    const subscription = createCryptoSubscription({
      cancelAtPeriodEnd: true,
    });

    expect(isPlusChargeRetryable(subscription, MONEY_ACCOUNT_ADDRESS)).toBe(
      false,
    );
  });

  it('returns false for a card payment method', () => {
    const subscription = createCryptoSubscription({
      paymentMethod: {
        type: PAYMENT_TYPES.byCard,
        card: { brand: 'visa', last4: '4242' },
      },
    });

    expect(isPlusChargeRetryable(subscription, MONEY_ACCOUNT_ADDRESS)).toBe(
      false,
    );
  });

  it('returns false when the payer is not the Money Account', () => {
    const subscription = createCryptoSubscription({
      paymentMethod: {
        type: PAYMENT_TYPES.byCrypto,
        crypto: {
          payerAddress: OTHER_ADDRESS,
          chainId: CHAIN_ID,
          tokenSymbol: 'mUSD',
        },
      },
    });

    expect(isPlusChargeRetryable(subscription, MONEY_ACCOUNT_ADDRESS)).toBe(
      false,
    );
  });

  it.each([
    INVOICE_PAYMENT_STATUSES.PROCESSING,
    INVOICE_PAYMENT_STATUSES.UNKNOWN,
  ])('returns false for past_due with a %s invoice', (invoiceStatus) => {
    const subscription = createCryptoSubscription({
      status: SUBSCRIPTION_STATUSES.pastDue,
      lastInvoice: {
        id: 'inv_1',
        status: invoiceStatus,
      },
    });

    expect(isPlusChargeRetryable(subscription, MONEY_ACCOUNT_ADDRESS)).toBe(
      false,
    );
  });

  it('returns false when subscription or address is missing', () => {
    expect(isPlusChargeRetryable(undefined, MONEY_ACCOUNT_ADDRESS)).toBe(false);
    expect(isPlusChargeRetryable(createCryptoSubscription(), undefined)).toBe(
      false,
    );
  });
});

describe('retryPlusChargeAfterDeposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckMoneyAccountBalance.mockResolvedValue({
      hasSufficientBalance: true,
      balance: '10000000',
      requiredBalance: '5000000',
    });
    mockUpdatePaymentMethod.mockResolvedValue([]);
  });

  it('skips the API when the subscription is not retryable', async () => {
    const subscription = createCryptoSubscription({
      status: SUBSCRIPTION_STATUSES.provisional,
    });

    await retryPlusChargeAfterDeposit(subscription, MONEY_ACCOUNT_ADDRESS);

    expect(mockCheckMoneyAccountBalance).not.toHaveBeenCalled();
    expect(mockUpdatePaymentMethod).not.toHaveBeenCalled();
  });

  it('skips the API when billingCycles is missing', async () => {
    const subscription = createCryptoSubscription({
      billingCycles: undefined,
    });

    await retryPlusChargeAfterDeposit(subscription, MONEY_ACCOUNT_ADDRESS);

    expect(mockCheckMoneyAccountBalance).not.toHaveBeenCalled();
    expect(mockUpdatePaymentMethod).not.toHaveBeenCalled();
  });

  it('skips updatePaymentMethod when the Money Account balance is insufficient', async () => {
    mockCheckMoneyAccountBalance.mockResolvedValue({
      hasSufficientBalance: false,
      balance: '1000',
      requiredBalance: '5000000',
    });
    const subscription = createCryptoSubscription();

    await retryPlusChargeAfterDeposit(subscription, MONEY_ACCOUNT_ADDRESS);

    expect(mockCheckMoneyAccountBalance).toHaveBeenCalledWith({
      product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      recurringInterval: RECURRING_INTERVALS.month,
      payerAddress: MONEY_ACCOUNT_ADDRESS,
    });
    expect(mockUpdatePaymentMethod).not.toHaveBeenCalled();
  });

  it('sends a credential-less updatePaymentMethod for a retryable subscription', async () => {
    const subscription = createCryptoSubscription();

    await retryPlusChargeAfterDeposit(subscription, MONEY_ACCOUNT_ADDRESS);

    expect(mockUpdatePaymentMethod).toHaveBeenCalledWith({
      paymentType: PAYMENT_TYPES.byCrypto,
      subscriptionId: 'sub-plus',
      chainId: CHAIN_ID,
      payerAddress: MONEY_ACCOUNT_ADDRESS,
      tokenSymbol: 'mUSD',
      recurringInterval: RECURRING_INTERVALS.month,
      billingCycles: 12,
    });
    expect(mockUpdatePaymentMethod.mock.calls[0][0]).not.toHaveProperty(
      'delegationHash',
    );
    expect(mockUpdatePaymentMethod.mock.calls[0][0]).not.toHaveProperty(
      'rawTransaction',
    );
    expect(mockUpdatePaymentMethod.mock.calls[0][0]).not.toHaveProperty(
      'cryptoAuthMethod',
    );
  });

  it('logs API failures and does not throw', async () => {
    const apiError = new Error('INSUFFICIENT_BALANCE');
    mockUpdatePaymentMethod.mockRejectedValue(apiError);
    const subscription = createCryptoSubscription();

    await expect(
      retryPlusChargeAfterDeposit(subscription, MONEY_ACCOUNT_ADDRESS),
    ).resolves.toBeUndefined();

    expect(Logger.error).toHaveBeenCalledWith(apiError, {
      tags: {
        feature: 'pro-subscription',
        operation: 'retry_plus_charge_after_deposit',
      },
    });
  });
});
