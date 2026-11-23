import type { SubscriptionPaymentMethod } from '@metamask/subscription-controller';
import { readVaultAddress } from './readVaultAddress';

const MOCK_VAULT_ADDRESS = '0xBFeC8c2b1ccea3931a1363E4CaC27352c1C908B7';

const cardPaymentMethod: SubscriptionPaymentMethod = {
  type: 'card',
  card: { brand: 'visa', last4: '1234' },
};

const cryptoPaymentMethod = (
  tokenAddress?: unknown,
): SubscriptionPaymentMethod =>
  ({
    type: 'crypto',
    crypto: {
      payerAddress: '0x15ffacc73fce2323d469df2cd23251e3e104352e',
      chainId: '0x1',
      tokenSymbol: 'pvmUSD',
      ...(tokenAddress === undefined ? {} : { tokenAddress }),
    },
  }) as SubscriptionPaymentMethod;

describe('readVaultAddress', () => {
  it('returns undefined when the payment method is missing', () => {
    const result = readVaultAddress(undefined);

    expect(result).toBeUndefined();
  });

  it('returns undefined for a card payment method', () => {
    const result = readVaultAddress(cardPaymentMethod);

    expect(result).toBeUndefined();
  });

  it('returns undefined when the crypto payment has no token address', () => {
    const result = readVaultAddress(cryptoPaymentMethod());

    expect(result).toBeUndefined();
  });

  it('returns undefined when the token address is not a string', () => {
    const result = readVaultAddress(cryptoPaymentMethod(1));

    expect(result).toBeUndefined();
  });

  it('returns undefined when the token address is empty', () => {
    const result = readVaultAddress(cryptoPaymentMethod(''));

    expect(result).toBeUndefined();
  });

  it('returns the vault address from a crypto payment method', () => {
    const result = readVaultAddress(cryptoPaymentMethod(MOCK_VAULT_ADDRESS));

    expect(result).toBe(MOCK_VAULT_ADDRESS);
  });
});
