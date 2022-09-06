import { strings } from '../../../locales/i18n';
import {
  validateCollectibleOwnership,
  validateEtherAmount,
  validateTokenAmount,
} from '.';
import { BN } from 'ethereumjs-util';

const TEST_VALUE = new BN('0');
const TEST_INVALID_VALUE = '0';
const TEST_FROM = '0x';
const TEST_INVALID_FROM = null;
const TEST_GAS = new BN('0');
const TEST_INVALID_GAS = null;
const TEST_SELECTED_ASSET = { address: '0x', decimals: '0', symbol: 'ETH' };
const TEST_CONTRACT_BALANCES = {};

describe('Dapp Transactions utils :: validateEtherAmount', () => {
  it('should return invalid amount', () => {
    expect(
      validateEtherAmount(
        TEST_INVALID_VALUE as unknown as BN,
        TEST_FROM,
        false,
      ),
    ).toEqual(strings('transaction.invalid_amount'));
  });
  it('should return undefined', () => {
    expect(validateEtherAmount(TEST_VALUE, TEST_FROM)).toBeUndefined();
  });
});

describe('Dapp Transactions utils :: validateTokenAmount', () => {
  it('should return invalid amount', async () => {
    expect(
      await validateTokenAmount(
        TEST_INVALID_VALUE as unknown as BN,
        TEST_GAS,
        TEST_FROM,
        TEST_SELECTED_ASSET,
        TEST_CONTRACT_BALANCES,
        false,
      ),
    ).toEqual(strings('transaction.invalid_amount'));
  });

  it('should return invalid gas', async () => {
    expect(
      await validateTokenAmount(
        TEST_VALUE,
        TEST_INVALID_GAS as unknown as BN,
        TEST_FROM,
        TEST_SELECTED_ASSET,
        TEST_CONTRACT_BALANCES,
        false,
      ),
    ).toEqual(strings('transaction.invalid_gas'));
  });

  it('should return invalid from', async () => {
    expect(
      await validateTokenAmount(
        TEST_VALUE,
        TEST_GAS,
        TEST_INVALID_FROM as unknown as string,
        TEST_SELECTED_ASSET,
        TEST_CONTRACT_BALANCES,
        false,
      ),
    ).toEqual(strings('transaction.invalid_from_address'));
  });

  it('should return undefined', async () => {
    expect(
      await validateTokenAmount(
        TEST_VALUE,
        TEST_GAS,
        TEST_FROM,
        TEST_SELECTED_ASSET,
        TEST_CONTRACT_BALANCES,
      ),
    ).toBeUndefined();
  });
});

describe('Dapp Transactions utils :: validateCollectibleOwnership', () => {
  const collectibleAddress = '0x';
  const tokenId = '1';
  const selectedAddress = '0x';

  it('should return false', async () => {
    expect(
      await validateCollectibleOwnership(
        collectibleAddress,
        tokenId,
        selectedAddress,
      ),
    ).toEqual(strings('transaction.invalid_collectible_ownership'));
  });
});
