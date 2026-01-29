import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { providerErrors } from '@metamask/rpc-errors';
import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

import Engine from '../../../../core/Engine';
import EngineService from '../../../../core/EngineService';
import { generateTransferData } from '../../../../util/transactions';
import { getTokenTransferData } from '../../../Views/confirmations/utils/transaction-pay';
import { parseStandardTokenTransactionData } from '../../../Views/confirmations/utils/transaction';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';
import {
  createMusdConversionTransaction,
  replaceMusdConversionTransactionForPayToken,
} from './musdConversionTransaction';

jest.mock('@metamask/rpc-errors', () => ({
  providerErrors: {
    userRejectedRequest: jest.fn(),
  },
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {},
  },
}));

jest.mock('../../../../core/EngineService', () => ({
  __esModule: true,
  default: {
    flushState: jest.fn(),
  },
}));

jest.mock('../../../../util/transactions', () => ({
  generateTransferData: jest.fn(),
}));

jest.mock('../../../Views/confirmations/utils/transaction-pay', () => ({
  getTokenTransferData: jest.fn(),
}));

jest.mock('../../../Views/confirmations/utils/transaction', () => ({
  parseStandardTokenTransactionData: jest.fn(),
}));

jest.mock('../constants/musd', () => ({
  /**
   * Mutable mapping so tests can override per-case.
   */
  MUSD_TOKEN_ADDRESS_BY_CHAIN: {},
}));

type MockedFindNetworkClientIdByChainId = (chainId: Hex) => string | undefined;

interface MockedEngineContext {
  NetworkController: {
    findNetworkClientIdByChainId: jest.MockedFunction<MockedFindNetworkClientIdByChainId>;
  };
  TransactionController: {
    addTransaction: jest.Mock<
      Promise<{ transactionMeta: { id: string } }>,
      [
        { to: Hex; from: Hex; data: Hex; value: '0x0' },
        {
          skipInitialGasEstimate: true;
          networkClientId: string;
          origin: typeof ORIGIN_METAMASK;
          type: TransactionType.musdConversion;
        },
      ]
    >;
  };
  GasFeeController?: {
    fetchGasFeeEstimates: jest.Mock<
      Promise<unknown>,
      [{ networkClientId?: string }]
    >;
  };
  TransactionPayController?: {
    updatePaymentToken: jest.Mock<
      void,
      [{ transactionId: string; tokenAddress: Hex; chainId: Hex }]
    >;
  };
  ApprovalController?: {
    reject: jest.Mock<void, [string, unknown]>;
  };
}

const mockedProviderErrors = providerErrors as jest.Mocked<
  typeof providerErrors
>;
const mockedEngineService = EngineService as jest.Mocked<typeof EngineService>;
const mockedEngine = Engine as unknown as { context: MockedEngineContext };

const mockedGenerateTransferData = generateTransferData as jest.MockedFunction<
  typeof generateTransferData
>;
const mockedGetTokenTransferData = getTokenTransferData as jest.MockedFunction<
  typeof getTokenTransferData
>;
const mockedParseStandardTokenTransactionData =
  parseStandardTokenTransactionData as jest.MockedFunction<
    typeof parseStandardTokenTransactionData
  >;

const createTransactionMeta = (
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta =>
  ({
    id: '0xpreviousTransactionId',
    txParams: {
      from: '0xfromAddress',
      chainId: '0xpreviousPayTokenChainId',
    },
    ...overrides,
  }) as unknown as TransactionMeta;

const createPayTokenSelection = (
  overrides: Partial<{ address: Hex; chainId: Hex }> = {},
): { address: Hex; chainId: Hex } =>
  ({
    address: '0xpayTokenAddress',
    chainId: '0x1',
    ...overrides,
  }) as { address: Hex; chainId: Hex };

describe('musdConversionTransaction', () => {
  const networkControllerFindNetworkClientIdByChainId = jest.fn<
    string | undefined,
    [Hex]
  >();

  const transactionControllerAddTransaction = jest.fn<
    Promise<{ transactionMeta: { id: string } }>,
    [
      { to: Hex; from: Hex; data: Hex; value: '0x0' },
      {
        skipInitialGasEstimate: true;
        networkClientId: string;
        origin: typeof ORIGIN_METAMASK;
        type: TransactionType.musdConversion;
      },
    ]
  >();

  const gasFeeControllerFetchGasFeeEstimates = jest.fn<
    Promise<unknown>,
    [{ networkClientId?: string }]
  >();

  const transactionPayControllerUpdatePaymentToken = jest.fn<
    void,
    [{ transactionId: string; tokenAddress: Hex; chainId: Hex }]
  >();

  const approvalControllerReject = jest.fn<void, [string, unknown]>();

  beforeEach(() => {
    jest.clearAllMocks();

    mockedEngine.context = {
      NetworkController: {
        findNetworkClientIdByChainId:
          networkControllerFindNetworkClientIdByChainId,
      },
      TransactionController: {
        addTransaction: transactionControllerAddTransaction,
      },
      GasFeeController: {
        fetchGasFeeEstimates: gasFeeControllerFetchGasFeeEstimates,
      },
      TransactionPayController: {
        updatePaymentToken: transactionPayControllerUpdatePaymentToken,
      },
      ApprovalController: {
        reject: approvalControllerReject,
      },
    };

    (MUSD_TOKEN_ADDRESS_BY_CHAIN as Record<string, Hex>)['0x1'] =
      '0xmusdTokenAddress';

    networkControllerFindNetworkClientIdByChainId.mockReturnValue(
      'networkClientId',
    );

    mockedGenerateTransferData.mockReturnValue('0xmockedTransferData' as Hex);

    mockedGetTokenTransferData.mockReturnValue({
      data: '0xtransferData' as Hex,
      to: '0x0000000000000000000000000000000000000000' as Hex,
    } as unknown as ReturnType<typeof getTokenTransferData>);

    gasFeeControllerFetchGasFeeEstimates.mockResolvedValue(undefined);
  });

  describe('createMusdConversionTransaction', () => {
    it('returns transactionId and creates an mUSD conversion transaction when networkClientId is provided', async () => {
      const chainId = '0x1' as Hex;
      const networkClientId = 'mainnet';
      const fromAddress = '0x1234567890abcdef1234567890abcdef12345678' as Hex;
      const recipientAddress =
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex;
      const amountHex = '0x1';

      transactionControllerAddTransaction.mockResolvedValue({
        transactionMeta: { id: 'tx-123' },
      });

      const result = await createMusdConversionTransaction({
        chainId,
        fromAddress,
        recipientAddress,
        amountHex,
        networkClientId,
      });

      expect(result).toEqual({ transactionId: 'tx-123', networkClientId });
      expect(
        networkControllerFindNetworkClientIdByChainId,
      ).not.toHaveBeenCalled();
      expect(generateTransferData).toHaveBeenCalledWith('transfer', {
        toAddress: recipientAddress,
        amount: amountHex,
      });
      expect(transactionControllerAddTransaction).toHaveBeenCalledWith(
        {
          to: '0xmusdTokenAddress',
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
      const chainId = '0x1' as Hex;
      const fromAddress = '0x1234567890abcdef1234567890abcdef12345678' as Hex;
      const recipientAddress =
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex;
      const amountHex = '0x2';

      networkControllerFindNetworkClientIdByChainId.mockReturnValue('mainnet');
      transactionControllerAddTransaction.mockResolvedValue({
        transactionMeta: { id: 'tx-456' },
      });

      const result = await createMusdConversionTransaction({
        chainId,
        fromAddress,
        recipientAddress,
        amountHex,
      });

      expect(result).toEqual({
        transactionId: 'tx-456',
        networkClientId: 'mainnet',
      });
      expect(
        networkControllerFindNetworkClientIdByChainId,
      ).toHaveBeenCalledWith(chainId);
      expect(transactionControllerAddTransaction).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          networkClientId: 'mainnet',
        }),
      );
    });

    it('throws when network client cannot be resolved', async () => {
      const chainId = '0x1' as Hex;

      networkControllerFindNetworkClientIdByChainId.mockReturnValue(undefined);

      await expect(
        createMusdConversionTransaction({
          chainId,
          fromAddress: '0x1234567890abcdef1234567890abcdef12345678' as Hex,
          recipientAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex,
          amountHex: '0x1',
        }),
      ).rejects.toThrow(`Network client not found for chain ID: ${chainId}`);

      expect(generateTransferData).not.toHaveBeenCalled();
      expect(transactionControllerAddTransaction).not.toHaveBeenCalled();
    });

    it('throws when mUSD token address is not available for outputChainId', async () => {
      const unsupportedChainId = '0x89' as Hex;

      networkControllerFindNetworkClientIdByChainId.mockReturnValue('polygon');

      await expect(
        createMusdConversionTransaction({
          chainId: unsupportedChainId,
          fromAddress: '0x1234567890abcdef1234567890abcdef12345678' as Hex,
          recipientAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex,
          amountHex: '0x1',
        }),
      ).rejects.toThrow(
        `mUSD token address not found for chain ID: ${unsupportedChainId}`,
      );

      expect(generateTransferData).not.toHaveBeenCalled();
      expect(transactionControllerAddTransaction).not.toHaveBeenCalled();
    });

    it.each([
      { amountHex: '1', description: 'unprefixed amount' },
      { amountHex: '0x1', description: 'prefixed amount' },
    ])(
      'passes amountHex through to generateTransferData for $description',
      async ({ amountHex }) => {
        const chainId = '0x1' as Hex;

        transactionControllerAddTransaction.mockResolvedValue({
          transactionMeta: { id: 'tx-789' },
        });

        await createMusdConversionTransaction({
          chainId,
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

  describe('replaceMusdConversionTransactionForPayToken', () => {
    let consoleErrorSpy: jest.SpyInstance<void, unknown[]>;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        // Intentionally empty for test output.
      });

      mockedProviderErrors.userRejectedRequest.mockReturnValue({
        name: 'userRejectedRequest',
        code: 4001,
        message: 'User rejected the request.',
        serialize: jest.fn(),
      });
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('throws when transactionMeta.id is missing', async () => {
      const transactionMeta = createTransactionMeta({
        id: undefined,
      });
      const newPayToken = createPayTokenSelection();

      await expect(
        replaceMusdConversionTransactionForPayToken(
          transactionMeta,
          newPayToken,
        ),
      ).rejects.toThrow(
        '[mUSD Conversion] Missing transaction metadata for replacement',
      );
    });

    it('throws when transactionMeta.txParams.from is missing', async () => {
      const transactionMeta = createTransactionMeta({
        txParams: {
          from: undefined,
          chainId: '0xpreviousPayTokenChainId',
        } as unknown as TransactionMeta['txParams'],
      });
      const newPayToken = createPayTokenSelection();

      await expect(
        replaceMusdConversionTransactionForPayToken(
          transactionMeta,
          newPayToken,
        ),
      ).rejects.toThrow(
        '[mUSD Conversion] Missing transaction metadata for replacement',
      );
    });

    it('returns undefined and logs when mUSD is not supported on selected chain', async () => {
      const transactionMeta = createTransactionMeta();
      const newPayToken = createPayTokenSelection({ chainId: '0x1234' });

      const result = await replaceMusdConversionTransactionForPayToken(
        transactionMeta,
        newPayToken,
      );

      expect(result).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[mUSD Conversion] Failed to replace transaction on chain change',
        expect.any(Error),
      );
    });

    it('uses parsed recipientAddress and amountHex from parsed token transfer data', async () => {
      const transactionMeta = createTransactionMeta({
        txParams: {
          from: '0xfromAddress',
          chainId: '0xpreviousPayTokenChainId',
        } as unknown as TransactionMeta['txParams'],
      });
      const newPayToken = createPayTokenSelection({
        address: '0xpayTokenAddress' as Hex,
        chainId: '0x1' as Hex,
      });

      mockedParseStandardTokenTransactionData.mockReturnValue({
        args: {
          _to: {
            toString: () => '0xrecipientFromParsed',
          },
          _value: {
            _hex: '0x2a',
          },
        },
      } as unknown as ReturnType<typeof parseStandardTokenTransactionData>);

      transactionControllerAddTransaction.mockResolvedValue({
        transactionMeta: { id: '0xnewTransactionId' },
      });

      const newTransactionId =
        await replaceMusdConversionTransactionForPayToken(
          transactionMeta,
          newPayToken,
        );

      expect(generateTransferData).toHaveBeenCalledWith('transfer', {
        toAddress: '0xrecipientFromParsed',
        amount: '0x2a',
      });

      expect(transactionControllerAddTransaction).toHaveBeenCalledWith(
        {
          to: '0xmusdTokenAddress',
          from: '0xfromAddress',
          data: '0xmockedTransferData',
          value: '0x0',
        },
        {
          skipInitialGasEstimate: true,
          networkClientId: 'networkClientId',
          origin: ORIGIN_METAMASK,
          type: TransactionType.musdConversion,
        },
      );

      expect(
        networkControllerFindNetworkClientIdByChainId,
      ).toHaveBeenCalledWith('0x1');

      expect(gasFeeControllerFetchGasFeeEstimates).toHaveBeenCalledWith({
        networkClientId: 'networkClientId',
      });

      expect(transactionPayControllerUpdatePaymentToken).toHaveBeenCalledWith({
        transactionId: '0xnewTransactionId',
        tokenAddress: '0xpayTokenAddress',
        chainId: '0x1',
      });

      expect(mockedEngineService.flushState).toHaveBeenCalled();

      expect(mockedProviderErrors.userRejectedRequest).toHaveBeenCalledWith({
        message:
          'Automatically rejected previous transaction due to same-chain enforcement for mUSD conversions',
        data: {
          cause: 'musdConversionSameChainEnforcement',
          previousTransactionId: '0xpreviousTransactionId',
          previousPayTokenChainId: '0xpreviousPayTokenChainId',
          newTransactionId: '0xnewTransactionId',
          newPayTokenChainId: '0x1',
        },
      });

      expect(approvalControllerReject).toHaveBeenCalledWith(
        '0xpreviousTransactionId',
        {
          name: 'userRejectedRequest',
          code: 4001,
          message: 'User rejected the request.',
          serialize: expect.any(Function),
        },
      );

      expect(newTransactionId).toBe('0xnewTransactionId');
    });

    it('falls back to transactionMeta.txParams.from when parsed recipient address is missing', async () => {
      const transactionMeta = createTransactionMeta({
        txParams: {
          from: '0xfromAddressFallback',
          chainId: '0xpreviousPayTokenChainId',
        } as unknown as TransactionMeta['txParams'],
      });
      const newPayToken = createPayTokenSelection({ chainId: '0x1' as Hex });

      mockedParseStandardTokenTransactionData.mockReturnValue({
        args: {
          _value: {
            _hex: '0x01',
          },
        },
      } as unknown as ReturnType<typeof parseStandardTokenTransactionData>);

      transactionControllerAddTransaction.mockResolvedValue({
        transactionMeta: { id: '0xnewTransactionId' },
      });

      await replaceMusdConversionTransactionForPayToken(
        transactionMeta,
        newPayToken,
      );

      expect(generateTransferData).toHaveBeenCalledWith('transfer', {
        toAddress: '0xfromAddressFallback',
        amount: '0x01',
      });
    });

    it('uses amountHex from toHexString when _hex is missing', async () => {
      const transactionMeta = createTransactionMeta();
      const newPayToken = createPayTokenSelection();

      mockedParseStandardTokenTransactionData.mockReturnValue({
        args: {
          _to: {
            toString: () => '0xrecipientAddress',
          },
          _value: {
            toHexString: () => '0x123',
          },
        },
      } as unknown as ReturnType<typeof parseStandardTokenTransactionData>);

      transactionControllerAddTransaction.mockResolvedValue({
        transactionMeta: { id: '0xnewTransactionId' },
      });

      await replaceMusdConversionTransactionForPayToken(
        transactionMeta,
        newPayToken,
      );

      expect(generateTransferData).toHaveBeenCalledWith('transfer', {
        toAddress: '0xrecipientAddress',
        amount: '0x123',
      });
    });

    it('defaults amountHex to 0x0 when parsed amount is missing', async () => {
      const transactionMeta = createTransactionMeta();
      const newPayToken = createPayTokenSelection();

      mockedParseStandardTokenTransactionData.mockReturnValue({
        args: {
          _to: {
            toString: () => '0xrecipientAddress',
          },
        },
      } as unknown as ReturnType<typeof parseStandardTokenTransactionData>);

      transactionControllerAddTransaction.mockResolvedValue({
        transactionMeta: { id: '0xnewTransactionId' },
      });

      await replaceMusdConversionTransactionForPayToken(
        transactionMeta,
        newPayToken,
      );

      expect(generateTransferData).toHaveBeenCalledWith('transfer', {
        toAddress: '0xrecipientAddress',
        amount: '0x0',
      });
    });

    it('continues replacement when gas fee estimates fetch rejects', async () => {
      const transactionMeta = createTransactionMeta();
      const newPayToken = createPayTokenSelection();

      gasFeeControllerFetchGasFeeEstimates.mockRejectedValueOnce(
        new Error('fetch failed'),
      );

      mockedParseStandardTokenTransactionData.mockReturnValue({
        args: {
          _to: {
            toString: () => '0xrecipientAddress',
          },
          _value: {
            _hex: '0x01',
          },
        },
      } as unknown as ReturnType<typeof parseStandardTokenTransactionData>);

      transactionControllerAddTransaction.mockResolvedValue({
        transactionMeta: { id: '0xnewTransactionId' },
      });

      const newTransactionId =
        await replaceMusdConversionTransactionForPayToken(
          transactionMeta,
          newPayToken,
        );

      expect(transactionPayControllerUpdatePaymentToken).toHaveBeenCalledTimes(
        1,
      );
      expect(approvalControllerReject).toHaveBeenCalledTimes(1);
      expect(newTransactionId).toBe('0xnewTransactionId');
    });

    it('continues replacement when approval rejection of previous transaction throws', async () => {
      const transactionMeta = createTransactionMeta();
      const newPayToken = createPayTokenSelection();

      mockedParseStandardTokenTransactionData.mockReturnValue({
        args: {
          _to: {
            toString: () => '0xrecipientAddress',
          },
          _value: {
            _hex: '0x01',
          },
        },
      } as unknown as ReturnType<typeof parseStandardTokenTransactionData>);

      transactionControllerAddTransaction.mockResolvedValue({
        transactionMeta: { id: '0xnewTransactionId' },
      });

      approvalControllerReject.mockImplementationOnce(() => {
        throw new Error('approval missing');
      });

      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {
          // Intentionally empty for test output.
        });

      const newTransactionId =
        await replaceMusdConversionTransactionForPayToken(
          transactionMeta,
          newPayToken,
        );

      expect(transactionPayControllerUpdatePaymentToken).toHaveBeenCalledTimes(
        1,
      );
      expect(approvalControllerReject).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[mUSD Conversion] Failed to reject previous transaction approval during replacement',
        expect.any(Error),
      );
      expect(newTransactionId).toBe('0xnewTransactionId');

      consoleWarnSpy.mockRestore();
    });

    it('returns undefined and logs when replacement fails', async () => {
      const transactionMeta = createTransactionMeta();
      const newPayToken = createPayTokenSelection();

      mockedParseStandardTokenTransactionData.mockReturnValue({
        args: {
          _to: {
            toString: () => '0xrecipientAddress',
          },
          _value: {
            _hex: '0x01',
          },
        },
      } as unknown as ReturnType<typeof parseStandardTokenTransactionData>);

      transactionControllerAddTransaction.mockRejectedValueOnce(
        new Error('transaction create failed'),
      );

      const newTransactionId =
        await replaceMusdConversionTransactionForPayToken(
          transactionMeta,
          newPayToken,
        );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[mUSD Conversion] Failed to replace transaction on chain change',
        expect.any(Error),
      );

      expect(transactionPayControllerUpdatePaymentToken).not.toHaveBeenCalled();
      expect(approvalControllerReject).not.toHaveBeenCalled();
      expect(mockedEngineService.flushState).not.toHaveBeenCalled();
      expect(newTransactionId).toBeUndefined();
    });
  });
});
