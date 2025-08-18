import { InternalAccount } from '@metamask/keyring-internal-api';
import { TransactionMeta } from '@metamask/transaction-controller';

// eslint-disable-next-line import/no-namespace
import * as TransactionUtils from '../../../../util/transaction-controller';
// eslint-disable-next-line import/no-namespace
import * as SendMultichainTransactionUtils from '../../../../core/SnapKeyring/utils/sendMultichainTransaction';
import { AssetType } from '../types/token';
import { SOLANA_ASSET } from '../__mocks__/send.mock';
import { InitSendLocation } from '../constants/send';
import {
  formatToFixedDecimals,
  fromBNWithDecimals,
  handleSendPageNavigation,
  prepareEVMTransaction,
  submitEvmTransaction,
  submitNonEvmTransaction,
  toBNWithDecimals,
} from './send';

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
    },
  },
}));

describe('handleSendPageNavigation', () => {
  it('navigates to send page', () => {
    const mockNavigate = jest.fn();
    handleSendPageNavigation(mockNavigate, InitSendLocation.WalletActions, {
      name: 'ETHEREUM',
    } as AssetType);
    expect(mockNavigate).toHaveBeenCalledWith('SendFlowView');
  });
});

describe('prepareEVMTransaction', () => {
  it('prepares transaction for native token', () => {
    expect(
      prepareEVMTransaction(
        {
          name: 'Ethereum',
          address: '0x123',
          isNative: true,
          chainId: '0x1',
        } as AssetType,
        { from: '0x123', to: '0x456', value: '100' },
      ),
    ).toStrictEqual({
      data: '0x',
      from: '0x123',
      to: '0x456',
      value: '0x56bc75e2d63100000',
    });
  });

  it('prepares transaction for ERC20 token', () => {
    expect(
      prepareEVMTransaction(
        {
          name: 'MyToken',
          address: '0x123',
          chainId: '0x1',
        } as AssetType,
        { from: '0x123', to: '0x456', value: '100' },
      ),
    ).toStrictEqual({
      data: '0xa9059cbb0000000000000000000000000000000000000000000000000000000000000456000000000000000000000000000000000000000000000000000000000003b27c',
      from: '0x123',
      to: '0x123',
      value: '0x0',
    });
  });

  it('prepares transaction for NFT token', () => {
    expect(
      prepareEVMTransaction(
        {
          name: 'MyNFT',
          address: '0x123',
          chainId: '0x1',
          tokenId: '0x1',
        } as AssetType,
        { from: '0x123', to: '0x456', value: '100' },
      ),
    ).toStrictEqual({
      data: '0x23b872dd000000000000000000000000000000000000000000000000000000000000012300000000000000000000000000000000000000000000000000000000000004560000000000000000000000000000000000000000000000000000000000000001',
      from: '0x123',
      to: '0x123',
      value: '0x0',
    });
  });
});

describe('submitEvmTransaction', () => {
  it('invokes TransactionUtils.addTransaction', () => {
    const mockAddTransaction = jest
      .spyOn(TransactionUtils, 'addTransaction')
      .mockImplementation(() =>
        Promise.resolve({
          result: Promise.resolve('123'),
          transactionMeta: { id: '123' } as TransactionMeta,
        }),
      );
    submitEvmTransaction({
      asset: { isNative: true } as AssetType,
      chainId: '0x1',
      from: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
      to: '0xeDd1935e28b253C7905Cf5a944f0B5830FFA967b',
      value: '10',
    });
    expect(mockAddTransaction).toHaveBeenCalled();
  });
});

describe('submitNonEvmTransaction', () => {
  it('invokes function sendMultichainTransaction', () => {
    const mockSendMultichainTransaction = jest
      .spyOn(SendMultichainTransactionUtils, 'sendMultichainTransaction')
      .mockImplementation(() => Promise.resolve());
    submitNonEvmTransaction({
      asset: SOLANA_ASSET,
      fromAccount: { id: 'solana_account_id' } as InternalAccount,
    });
    expect(mockSendMultichainTransaction).toHaveBeenCalled();
  });
});

describe('formatToFixedDecimals', () => {
  it('return `0` is value is equivalent to 0', () => {
    expect(formatToFixedDecimals('0.0000')).toEqual('0');
  });
  it('return correct string for very small values', () => {
    expect(formatToFixedDecimals('0.01', 1)).toEqual('< 0.1');
    expect(formatToFixedDecimals('0.001', 2)).toEqual('< 0.01');
    expect(formatToFixedDecimals('0.0001', 3)).toEqual('< 0.001');
    expect(formatToFixedDecimals('0.00001', 4)).toEqual('< 0.0001');
  });
  it('formats value with passed number of decimals', () => {
    expect(formatToFixedDecimals('1', 4)).toEqual('1.0000');
    expect(formatToFixedDecimals('1.01010101', 4)).toEqual('1.0101');
  });
});

describe('toBNWithDecimals', () => {
  it('converts value to bignumber correctly', () => {
    expect(toBNWithDecimals('1.20', 5).toString()).toEqual('120000');
  });
  it('converts value to bignumber correctly', () => {
    expect(toBNWithDecimals('.1', 5).toString()).toEqual('10000');
  });
  it('converts value to bignumber correctly', () => {
    expect(toBNWithDecimals('0', 5).toString()).toEqual('0');
  });
});

describe('fromBNWithDecimals', () => {
  it('converts bignumber to string correctly', () => {
    expect(
      fromBNWithDecimals(toBNWithDecimals('1.20', 5), 5).toString(),
    ).toEqual('1.2');
  });
  it('converts value to bignumber correctly', () => {
    expect(fromBNWithDecimals(toBNWithDecimals('.1', 5), 5).toString()).toEqual(
      '0.1',
    );
  });
  it('converts value to bignumber correctly', () => {
    expect(fromBNWithDecimals(toBNWithDecimals('0', 5), 5).toString()).toEqual(
      '0',
    );
  });
});
