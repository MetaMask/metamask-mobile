import { TransactionType } from '@metamask/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { generateTransferData } from '../../../../util/transactions';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';
import { createMusdConversionTransaction } from './createMusdConversionTransaction';

jest.mock('../../../../core/Engine');
jest.mock('../../../../util/transactions');

const mockNetworkController = {
  findNetworkClientIdByChainId: jest.fn(),
};

const mockTransactionController = {
  addTransaction: jest.fn(),
};

describe('createMusdConversionTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(Engine, 'context', {
      value: {
        NetworkController: mockNetworkController,
        TransactionController: mockTransactionController,
      },
      writable: true,
      configurable: true,
    });

    (generateTransferData as jest.Mock).mockReturnValue('0xmockedTransferData');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns transactionId and creates an mUSD conversion transaction when networkClientId is provided', async () => {
    const outputChainId = '0x1' as Hex;
    const networkClientId = 'mainnet';
    const fromAddress = '0x1234567890abcdef1234567890abcdef12345678' as Hex;
    const recipientAddress =
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex;
    const amountHex = '0x1';

    mockTransactionController.addTransaction.mockResolvedValue({
      transactionMeta: { id: 'tx-123' },
    });

    const result = await createMusdConversionTransaction({
      outputChainId,
      fromAddress,
      recipientAddress,
      amountHex,
      networkClientId,
    });

    expect(result).toEqual({ transactionId: 'tx-123' });
    expect(
      mockNetworkController.findNetworkClientIdByChainId,
    ).not.toHaveBeenCalled();
    expect(generateTransferData).toHaveBeenCalledWith('transfer', {
      toAddress: recipientAddress,
      amount: amountHex,
    });
    expect(mockTransactionController.addTransaction).toHaveBeenCalledWith(
      {
        to: MUSD_TOKEN_ADDRESS_BY_CHAIN[outputChainId],
        from: fromAddress,
        data: '0xmockedTransferData',
        value: '0x0',
      },
      {
        skipInitialGasEstimate: true,
        networkClientId,
        origin: ORIGIN_METAMASK,
        type: TransactionType.musdConversion,
      },
    );
  });

  it('resolves networkClientId from NetworkController when not provided', async () => {
    const outputChainId = '0x1' as Hex;
    const fromAddress = '0x1234567890abcdef1234567890abcdef12345678' as Hex;
    const recipientAddress =
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex;
    const amountHex = '0x2';

    mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
      'mainnet',
    );
    mockTransactionController.addTransaction.mockResolvedValue({
      transactionMeta: { id: 'tx-456' },
    });

    const result = await createMusdConversionTransaction({
      outputChainId,
      fromAddress,
      recipientAddress,
      amountHex,
    });

    expect(result).toEqual({ transactionId: 'tx-456' });
    expect(
      mockNetworkController.findNetworkClientIdByChainId,
    ).toHaveBeenCalledWith(outputChainId);
    expect(mockTransactionController.addTransaction).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        networkClientId: 'mainnet',
      }),
    );
  });

  it('throws when network client cannot be resolved', async () => {
    const outputChainId = '0x1' as Hex;

    mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
      undefined,
    );

    await expect(
      createMusdConversionTransaction({
        outputChainId,
        fromAddress: '0x1234567890abcdef1234567890abcdef12345678' as Hex,
        recipientAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex,
        amountHex: '0x1',
      }),
    ).rejects.toThrow(
      `Network client not found for chain ID: ${outputChainId}`,
    );

    expect(generateTransferData).not.toHaveBeenCalled();
    expect(mockTransactionController.addTransaction).not.toHaveBeenCalled();
  });

  it('throws when mUSD token address is not available for outputChainId', async () => {
    const unsupportedChainId = '0x89' as Hex;

    mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
      'polygon',
    );

    await expect(
      createMusdConversionTransaction({
        outputChainId: unsupportedChainId,
        fromAddress: '0x1234567890abcdef1234567890abcdef12345678' as Hex,
        recipientAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex,
        amountHex: '0x1',
      }),
    ).rejects.toThrow(
      `mUSD token address not found for chain ID: ${unsupportedChainId}`,
    );

    expect(generateTransferData).not.toHaveBeenCalled();
    expect(mockTransactionController.addTransaction).not.toHaveBeenCalled();
  });

  it.each([
    { amountHex: '1', description: 'unprefixed amount' },
    { amountHex: '0x1', description: 'prefixed amount' },
  ])(
    'passes amountHex through to generateTransferData for $description',
    async ({ amountHex }) => {
      const outputChainId = '0x1' as Hex;

      mockTransactionController.addTransaction.mockResolvedValue({
        transactionMeta: { id: 'tx-789' },
      });

      await createMusdConversionTransaction({
        outputChainId,
        fromAddress: '0x1234567890abcdef1234567890abcdef12345678' as Hex,
        recipientAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex,
        amountHex,
        networkClientId: 'mainnet',
      });

      expect(generateTransferData).toHaveBeenCalledWith('transfer', {
        toAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        amount: amountHex,
      });
    },
  );
});
