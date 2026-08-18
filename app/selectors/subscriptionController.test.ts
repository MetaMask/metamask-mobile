import {
  CANCEL_TYPES,
  CRYPTO_AUTH_METHODS,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  SUBSCRIPTION_STATUSES,
  type PricingCryptoPaymentMethod,
  type PricingResponse,
  type Subscription,
  type VaultTokenPaymentInfo,
} from '@metamask/subscription-controller';
import type { Hex } from '@metamask/utils';
import type { RootState } from '../reducers';
import {
  selectLastSelectedPaymentMethodByProduct,
  selectLastSubscriptionByProduct,
  selectSubscriptionByProduct,
  selectSubscriptionControllerState,
  selectSubscriptionPricing,
  selectSubscriptions,
  selectTrialedSubscriptionProducts,
} from './subscriptionController';

const SHIELD_ADDRESS = '0x1111111111111111111111111111111111111111' as Hex;
const VAULT_TOKEN_ADDRESS = '0xb4563bcd3b7764ccbf497f515585f70b6c3ea5ae' as Hex;
const ACCOUNTANT_ADDRESS = '0xc7f1b2228fbf28451c7bf791c4f610111f0f32cb' as Hex;
const PAYMENT_ADDRESS = '0x2222222222222222222222222222222222222222' as Hex;
const DELEGATE_ADDRESS = '0x3333333333333333333333333333333333333333' as Hex;

const createProduct = (
  name: (typeof PRODUCT_TYPES)[keyof typeof PRODUCT_TYPES],
) => ({
  name,
  currency: 'usd' as const,
  unitAmount: 800,
  unitDecimals: 2,
});

const createSubscription = (
  overrides: Partial<Subscription> & Pick<Subscription, 'id' | 'products'>,
): Subscription => ({
  currentPeriodStart: '2026-01-01T00:00:00.000Z',
  currentPeriodEnd: '2026-02-01T00:00:00.000Z',
  status: SUBSCRIPTION_STATUSES.active,
  interval: RECURRING_INTERVALS.month,
  paymentMethod: {
    type: PAYMENT_TYPES.byCard,
    card: {
      brand: 'visa',
      displayBrand: 'visa',
      last4: '4242',
    },
  },
  cancelType: CANCEL_TYPES.ALLOWED_AT_PERIOD_END,
  isEligibleForSupport: true,
  ...overrides,
});

const PRICING_FIXTURE: PricingResponse = {
  products: [
    {
      name: PRODUCT_TYPES.SHIELD,
      prices: [
        {
          interval: RECURRING_INTERVALS.month,
          unitAmount: 800,
          unitDecimals: 2,
          currency: 'usd',
          trialPeriodDays: 14,
          minBillingCycles: 12,
          minBillingCyclesForBalance: 1,
        },
      ],
    },
    {
      name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      prices: [
        {
          interval: RECURRING_INTERVALS.month,
          unitAmount: 500,
          unitDecimals: 2,
          currency: 'usd',
          trialPeriodDays: 0,
          minBillingCycles: 1,
          minBillingCyclesForBalance: 1,
        },
      ],
    },
  ],
  paymentMethods: [
    {
      type: PAYMENT_TYPES.byCard,
      products: [PRODUCT_TYPES.SHIELD, PRODUCT_TYPES.MONEY_ACCOUNT_PLUS],
    },
    {
      type: PAYMENT_TYPES.byCrypto,
      cryptoAuthMethod: CRYPTO_AUTH_METHODS.ERC20_APPROVAL,
      products: [PRODUCT_TYPES.SHIELD],
      chains: [
        {
          chainId: '0x1',
          paymentAddress: PAYMENT_ADDRESS,
          tokens: [
            {
              symbol: 'USDC',
              address: SHIELD_ADDRESS,
              decimals: 6,
              conversionRate: { usd: '1.0' },
            },
          ],
        },
      ],
    },
    {
      type: PAYMENT_TYPES.byCrypto,
      cryptoAuthMethod: CRYPTO_AUTH_METHODS.DELEGATION,
      products: [PRODUCT_TYPES.MONEY_ACCOUNT_PLUS],
      chains: [
        {
          chainId: '0x8f',
          paymentAddress: PAYMENT_ADDRESS,
          delegateAddress: DELEGATE_ADDRESS,
          tokens: [
            {
              symbol: 'veda',
              address: VAULT_TOKEN_ADDRESS,
              decimals: 6,
              isVaultShare: true,
              accountantAddress: ACCOUNTANT_ADDRESS,
            },
          ],
        },
      ],
    },
  ],
};

const createState = (
  subscriptionControllerState?: RootState['engine']['backgroundState']['SubscriptionController'],
): RootState =>
  ({
    engine: {
      backgroundState: subscriptionControllerState
        ? { SubscriptionController: subscriptionControllerState }
        : {},
    },
  }) as RootState;

describe('subscriptionController selectors', () => {
  describe('selectSubscriptionControllerState', () => {
    it('returns stable default state when the controller is absent', () => {
      const first = selectSubscriptionControllerState(createState());
      const second = selectSubscriptionControllerState(createState());

      expect(first).toEqual({
        subscriptions: [],
        trialedProducts: [],
      });
      expect(first).toBe(second);
    });
  });

  describe('selectSubscriptions', () => {
    it('returns subscriptions from controller state', () => {
      const shieldSubscription = createSubscription({
        id: 'sub-shield',
        products: [createProduct(PRODUCT_TYPES.SHIELD)],
      });

      const result = selectSubscriptions(
        createState({
          subscriptions: [shieldSubscription],
          trialedProducts: [],
        }),
      );

      expect(result).toEqual([shieldSubscription]);
    });

    it('returns a stable empty array when controller state is absent', () => {
      const first = selectSubscriptions(createState());
      const second = selectSubscriptions(createState());

      expect(first).toEqual([]);
      expect(first).toBe(second);
    });
  });

  describe('selectTrialedSubscriptionProducts', () => {
    it('returns trialed products from controller state', () => {
      const result = selectTrialedSubscriptionProducts(
        createState({
          subscriptions: [],
          trialedProducts: [PRODUCT_TYPES.SHIELD],
        }),
      );

      expect(result).toEqual([PRODUCT_TYPES.SHIELD]);
    });

    it('returns a stable empty array when controller state is absent', () => {
      const first = selectTrialedSubscriptionProducts(createState());
      const second = selectTrialedSubscriptionProducts(createState());

      expect(first).toEqual([]);
      expect(first).toBe(second);
    });
  });

  describe('selectSubscriptionPricing', () => {
    it('returns v8 pricing unchanged', () => {
      const result = selectSubscriptionPricing(
        createState({
          subscriptions: [],
          trialedProducts: [],
          pricing: PRICING_FIXTURE,
        }),
      );

      expect(result).toBe(PRICING_FIXTURE);
    });

    it('returns undefined when pricing is absent', () => {
      const result = selectSubscriptionPricing(
        createState({
          subscriptions: [],
          trialedProducts: [],
        }),
      );

      expect(result).toBeUndefined();
    });

    it('narrows card and crypto payment methods and vault tokens with missing conversion rates', () => {
      const pricing = selectSubscriptionPricing(
        createState({
          subscriptions: [],
          trialedProducts: [],
          pricing: PRICING_FIXTURE,
        }),
      );

      const cardMethod = pricing?.paymentMethods.find(
        (method) => method.type === PAYMENT_TYPES.byCard,
      );
      const cryptoMethod = pricing?.paymentMethods.find(
        (method): method is PricingCryptoPaymentMethod =>
          method.type === PAYMENT_TYPES.byCrypto &&
          method.cryptoAuthMethod === CRYPTO_AUTH_METHODS.DELEGATION,
      );
      const vaultToken = cryptoMethod?.chains?.[0]?.tokens.find(
        (token): token is VaultTokenPaymentInfo => token.isVaultShare === true,
      );

      expect(cardMethod?.type).toBe(PAYMENT_TYPES.byCard);
      expect(cryptoMethod?.chains?.[0]?.delegateAddress).toBe(DELEGATE_ADDRESS);
      expect(vaultToken?.accountantAddress).toBe(ACCOUNTANT_ADDRESS);
      expect(vaultToken?.conversionRate).toBeUndefined();
    });
  });

  describe('selectSubscriptionByProduct', () => {
    it('selects Shield and Money Account Plus independently from separate subscriptions', () => {
      const shieldSubscription = createSubscription({
        id: 'sub-shield',
        products: [createProduct(PRODUCT_TYPES.SHIELD)],
      });
      const moneyAccountPlusSubscription = createSubscription({
        id: 'sub-money-account-plus',
        products: [createProduct(PRODUCT_TYPES.MONEY_ACCOUNT_PLUS)],
      });
      const state = createState({
        subscriptions: [shieldSubscription, moneyAccountPlusSubscription],
        trialedProducts: [],
      });

      expect(selectSubscriptionByProduct(state, PRODUCT_TYPES.SHIELD)).toEqual(
        shieldSubscription,
      );
      expect(
        selectSubscriptionByProduct(state, PRODUCT_TYPES.MONEY_ACCOUNT_PLUS),
      ).toEqual(moneyAccountPlusSubscription);
    });

    it('matches a multi-product subscription through subscription.products', () => {
      const multiProductSubscription = createSubscription({
        id: 'sub-multi',
        products: [
          createProduct(PRODUCT_TYPES.SHIELD),
          createProduct(PRODUCT_TYPES.MONEY_ACCOUNT_PLUS),
        ],
      });
      const state = createState({
        subscriptions: [multiProductSubscription],
        trialedProducts: [],
      });

      expect(selectSubscriptionByProduct(state, PRODUCT_TYPES.SHIELD)).toEqual(
        multiProductSubscription,
      );
      expect(
        selectSubscriptionByProduct(state, PRODUCT_TYPES.MONEY_ACCOUNT_PLUS),
      ).toEqual(multiProductSubscription);
    });

    it('returns undefined when no subscription contains the product', () => {
      const state = createState({
        subscriptions: [
          createSubscription({
            id: 'sub-shield',
            products: [createProduct(PRODUCT_TYPES.SHIELD)],
          }),
        ],
        trialedProducts: [],
      });

      expect(
        selectSubscriptionByProduct(state, PRODUCT_TYPES.MONEY_ACCOUNT_PLUS),
      ).toBeUndefined();
    });
  });

  describe('selectLastSubscriptionByProduct', () => {
    it('returns lastSubscription when it contains the requested product', () => {
      const lastSubscription = createSubscription({
        id: 'last-multi',
        products: [
          createProduct(PRODUCT_TYPES.SHIELD),
          createProduct(PRODUCT_TYPES.MONEY_ACCOUNT_PLUS),
        ],
      });
      const state = createState({
        subscriptions: [],
        trialedProducts: [],
        lastSubscription,
      });

      expect(
        selectLastSubscriptionByProduct(state, PRODUCT_TYPES.SHIELD),
      ).toEqual(lastSubscription);
      expect(
        selectLastSubscriptionByProduct(
          state,
          PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
        ),
      ).toEqual(lastSubscription);
    });

    it('returns undefined when lastSubscription does not contain the product', () => {
      const state = createState({
        subscriptions: [],
        trialedProducts: [],
        lastSubscription: createSubscription({
          id: 'last-shield',
          products: [createProduct(PRODUCT_TYPES.SHIELD)],
        }),
      });

      expect(
        selectLastSubscriptionByProduct(
          state,
          PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
        ),
      ).toBeUndefined();
    });
  });

  describe('selectLastSelectedPaymentMethodByProduct', () => {
    it('returns the cached payment method for the requested product', () => {
      const shieldPaymentMethod = {
        type: PAYMENT_TYPES.byCrypto,
        plan: RECURRING_INTERVALS.month,
        paymentTokenSymbol: 'USDC',
        cryptoAuthMethod: CRYPTO_AUTH_METHODS.ERC20_APPROVAL,
      };
      const state = createState({
        subscriptions: [],
        trialedProducts: [],
        lastSelectedPaymentMethod: {
          [PRODUCT_TYPES.SHIELD]: shieldPaymentMethod,
        },
      });

      expect(
        selectLastSelectedPaymentMethodByProduct(state, PRODUCT_TYPES.SHIELD),
      ).toEqual(shieldPaymentMethod);
    });

    it('returns undefined when a per-product cached payment method is missing', () => {
      const state = createState({
        subscriptions: [],
        trialedProducts: [],
        lastSelectedPaymentMethod: {
          [PRODUCT_TYPES.SHIELD]: {
            type: PAYMENT_TYPES.byCard,
            plan: RECURRING_INTERVALS.month,
          },
        },
      });

      expect(
        selectLastSelectedPaymentMethodByProduct(
          state,
          PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
        ),
      ).toBeUndefined();
    });

    it('returns undefined when lastSelectedPaymentMethod is absent', () => {
      const state = createState({
        subscriptions: [],
        trialedProducts: [],
      });

      expect(
        selectLastSelectedPaymentMethodByProduct(state, PRODUCT_TYPES.SHIELD),
      ).toBeUndefined();
    });
  });
});
