import { BN } from 'ethereumjs-util';

import { strings } from '../../../locales/i18n';
import Engine from '../../core/Engine';
import {
  validateCollectibleOwnership,
  validateEtherAmount,
  validateTokenAmount,
} from '.';

const TEST_VALUE = new BN('0');
const TEST_INVALID_VALUE = '0';
const TEST_FROM = '0x';
const TEST_INVALID_FROM = null;
const TEST_GAS = new BN('0');
const TEST_INVALID_GAS = null;
const TEST_SELECTED_ASSET = { address: '0x', decimals: '0', symbol: 'ETH' };
const TEST_SELECTED_ADDRESS = '0x0';
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
        TEST_SELECTED_ADDRESS,
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
        TEST_SELECTED_ADDRESS,
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
        TEST_SELECTED_ADDRESS,
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
        TEST_SELECTED_ADDRESS,
        TEST_CONTRACT_BALANCES,
      ),
    ).toBeUndefined();
  });

  it('should check value from contractBalances if selectedAddress is from address', async () => {
    const mockGetERC20BalanceOf = jest.fn().mockReturnValue('0x0');
    Engine.context.AssetsContractController = {
      getERC20BalanceOf: mockGetERC20BalanceOf,
    };
    expect(
      await validateTokenAmount(
        new BN(5),
        TEST_GAS,
        TEST_FROM,
        TEST_SELECTED_ASSET,
        TEST_FROM,
        { '0x': '10' },
        false,
      ),
    ).toEqual(undefined);
    expect(mockGetERC20BalanceOf).toBeCalledTimes(0);
  });

  it('should call AssetsContractController.getERC20BalanceOf to get user balance if selectedAddress is not from address', async () => {
    const mockGetERC20BalanceOf = jest.fn().mockReturnValue('0x0');
    Engine.context.AssetsContractController = {
      getERC20BalanceOf: mockGetERC20BalanceOf,
    };

    const result = await validateTokenAmount(
      new BN(5),
      TEST_GAS,
      TEST_FROM,
      TEST_SELECTED_ASSET,
      TEST_SELECTED_ADDRESS,
      { '0x': '10' },
      false,
    );
    expect(mockGetERC20BalanceOf).toBeCalledTimes(1);
    expect(result).toEqual(strings('transaction.insufficient'));
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
