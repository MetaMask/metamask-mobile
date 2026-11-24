import {
  CRYPTO_AUTH_METHODS,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  type PricingResponse,
} from '@metamask/subscription-controller';
import type { Hex } from '@metamask/utils';
import { getMoneyAccountPlusCryptoPayment } from './getMoneyAccountPlusCryptoPayment';

const CHAIN_ID: Hex = '0x8f';

function createPricing(): PricingResponse {
  return {
    products: [],
    paymentMethods: [
      {
        type: PAYMENT_TYPES.byCrypto,
        cryptoAuthMethod: CRYPTO_AUTH_METHODS.DELEGATION,
        products: [PRODUCT_TYPES.MONEY_ACCOUNT_PLUS],
        chains: [
          {
            chainId: CHAIN_ID,
            paymentAddress: '0x1111111111111111111111111111111111111111',
            delegateAddress: '0x2222222222222222222222222222222222222222',
            tokens: [
              {
                symbol: 'mUSD',
                address: '0x3333333333333333333333333333333333333333',
                decimals: 6,
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('getMoneyAccountPlusCryptoPayment', () => {
  it('returns the matching delegation chain and first token symbol', () => {
    const pricing = createPricing();

    const result = getMoneyAccountPlusCryptoPayment(pricing, CHAIN_ID);

    expect(result).toEqual({
      chainId: CHAIN_ID,
      tokenSymbol: 'mUSD',
      tokenAddress: '0x3333333333333333333333333333333333333333',
    });
  });

  it('returns undefined for ERC-20 approval payment methods', () => {
    const pricing = createPricing();
    pricing.paymentMethods[0] = {
      ...pricing.paymentMethods[0],
      type: PAYMENT_TYPES.byCrypto,
      cryptoAuthMethod: CRYPTO_AUTH_METHODS.ERC20_APPROVAL,
    };

    const result = getMoneyAccountPlusCryptoPayment(pricing, CHAIN_ID);

    expect(result).toBeUndefined();
  });

  it('returns undefined when the requested chain is absent', () => {
    const pricing = createPricing();

    const result = getMoneyAccountPlusCryptoPayment(pricing, '0x1');

    expect(result).toBeUndefined();
  });

  it('returns undefined when pricing is absent', () => {
    const result = getMoneyAccountPlusCryptoPayment(undefined, CHAIN_ID);

    expect(result).toBeUndefined();
  });
});
