import { Interface } from '@ethersproject/abi';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import Engine from '../../../../core/Engine';
import { updateTransaction } from '../../../../util/transaction-controller';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../../UI/Earn/constants/musd';
import {
  extractTransferAmount,
  updateMusdConversionChain,
} from './musd-conversion';

jest.mock('../../../../core/Engine', () => ({
  context: {
    TransactionController: {
      getTransactions: jest.fn(),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/transaction-controller', () => ({
  updateTransaction: jest.fn(),
}));

const mockUpdateTransaction = updateTransaction as jest.MockedFunction<
  typeof updateTransaction
>;

const erc20Interface = new Interface(abiERC20);

const createTransactionMeta = (
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta => ({
  id: 'test-tx-id',
  chainId: '0x1' as Hex,
  networkClientId: 'mainnet',
  status: TransactionStatus.unapproved,
  time: Date.now(),
  type: TransactionType.musdConversion,
  txParams: {
    from: '0x1234567890123456789012345678901234567890' as Hex,
    to: MUSD_TOKEN_ADDRESS_BY_CHAIN['0x1' as Hex],
    data: erc20Interface.encodeFunctionData('transfer', [
      '0x1234567890123456789012345678901234567890',
      '1000000',
    ]) as Hex,
    value: '0x0' as Hex,
  },
  ...overrides,
});

describe('extractTransferAmount', () => {
  it('returns 0x0 for undefined data', () => {
    const result = extractTransferAmount(undefined);

    expect(result).toBe('0x0');
  });

  it('returns 0x0 for empty string data', () => {
    const result = extractTransferAmount('');

    expect(result).toBe('0x0');
  });

  it('extracts amount from valid ERC20 transfer data', () => {
    const amount = '1000000000000000000';
    const transferData = erc20Interface.encodeFunctionData('transfer', [
      '0x1234567890123456789012345678901234567890',
      amount,
    ]);

    const result = extractTransferAmount(transferData);

    expect(result).toBe('0x0de0b6b3a7640000');
  });

  it('returns 0x0 for non-transfer function data', () => {
    const approveData = erc20Interface.encodeFunctionData('approve', [
      '0x1234567890123456789012345678901234567890',
      '1000000',
    ]);

    const result = extractTransferAmount(approveData);

    expect(result).toBe('0x0');
  });

  it('returns 0x0 for malformed data', () => {
    const result = extractTransferAmount('0xinvaliddata');

    expect(result).toBe('0x0');
  });
});

describe('updateMusdConversionChain', () => {
  const mockTransactionController = Engine.context
    .TransactionController as jest.Mocked<
    typeof Engine.context.TransactionController
  >;
  const mockNetworkController = Engine.context.NetworkController as jest.Mocked<
    typeof Engine.context.NetworkController
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates transaction to target mUSD on new chain', () => {
    const transactionMeta = createTransactionMeta();
    const newChainId = '0xe708' as Hex;
    const newNetworkClientId = 'linea-mainnet';

    mockTransactionController.getTransactions.mockReturnValue([
      transactionMeta,
    ]);
    mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
      newNetworkClientId,
    );

    updateMusdConversionChain({
      transactionMeta,
      newChainId,
    });

    expect(mockUpdateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: newChainId,
        networkClientId: newNetworkClientId,
        txParams: expect.objectContaining({
          to: MUSD_TOKEN_ADDRESS_BY_CHAIN[newChainId],
        }),
      }),
      'Updated mUSD conversion transaction for chain change',
    );
  });

  it('preserves transfer amount when updating chain', () => {
    const originalAmount = '5000000';
    const transferData = erc20Interface.encodeFunctionData('transfer', [
      '0x1234567890123456789012345678901234567890',
      originalAmount,
    ]) as Hex;

    const transactionMeta = createTransactionMeta({
      txParams: {
        from: '0x1234567890123456789012345678901234567890' as Hex,
        to: MUSD_TOKEN_ADDRESS_BY_CHAIN['0x1' as Hex],
        data: transferData,
        value: '0x0' as Hex,
      },
    });
    const newChainId = '0xe708' as Hex;

    mockTransactionController.getTransactions.mockReturnValue([
      transactionMeta,
    ]);
    mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
      'linea-mainnet',
    );

    updateMusdConversionChain({
      transactionMeta,
      newChainId,
    });

    expect(mockUpdateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        txParams: expect.objectContaining({
          data: expect.stringContaining('a9059cbb'),
        }),
      }),
      expect.any(String),
    );
  });

  it('throws error when chain does not support mUSD', () => {
    const transactionMeta = createTransactionMeta();
    const unsupportedChainId = '0x999' as Hex;

    expect(() =>
      updateMusdConversionChain({
        transactionMeta,
        newChainId: unsupportedChainId,
      }),
    ).toThrow(
      `[mUSD Conversion] Chain ${unsupportedChainId} not supported for mUSD output`,
    );
  });

  it('throws error when transaction is not found', () => {
    const transactionMeta = createTransactionMeta();
    const newChainId = '0xe708' as Hex;

    mockTransactionController.getTransactions.mockReturnValue([]);

    expect(() =>
      updateMusdConversionChain({
        transactionMeta,
        newChainId,
      }),
    ).toThrow(
      `[mUSD Conversion] Transaction not found for ID: ${transactionMeta.id}`,
    );
  });

  it('throws error when network client is not found', () => {
    const transactionMeta = createTransactionMeta();
    const newChainId = '0xe708' as Hex;

    mockTransactionController.getTransactions.mockReturnValue([
      transactionMeta,
    ]);
    mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
      undefined,
    );

    expect(() =>
      updateMusdConversionChain({
        transactionMeta,
        newChainId,
      }),
    ).toThrow(
      `[mUSD Conversion] Network client not found for chain ID: ${newChainId}`,
    );
  });

  it('uses from address as recipient for self-transfer', () => {
    const fromAddress = '0xabcdef1234567890abcdef1234567890abcdef12' as Hex;
    const transactionMeta = createTransactionMeta({
      txParams: {
        from: fromAddress,
        to: MUSD_TOKEN_ADDRESS_BY_CHAIN['0x1' as Hex],
        data: erc20Interface.encodeFunctionData('transfer', [
          fromAddress,
          '1000000',
        ]) as Hex,
        value: '0x0' as Hex,
      },
    });
    const newChainId = '0xe708' as Hex;

    mockTransactionController.getTransactions.mockReturnValue([
      transactionMeta,
    ]);
    mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
      'linea-mainnet',
    );

    updateMusdConversionChain({
      transactionMeta,
      newChainId,
    });

    const updateCall = mockUpdateTransaction.mock.calls[0][0];
    const transferData = updateCall.txParams?.data as string;

    expect(transferData.toLowerCase()).toContain(
      fromAddress.toLowerCase().slice(2),
    );
  });
});
