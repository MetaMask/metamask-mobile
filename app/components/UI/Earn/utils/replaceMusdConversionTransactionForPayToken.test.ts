import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

import { providerErrors } from '@metamask/rpc-errors';

import Engine from '../../../../core/Engine';
import EngineService from '../../../../core/EngineService';
import { getTokenTransferData } from '../../../Views/confirmations/utils/transaction-pay';
import { parseStandardTokenTransactionData } from '../../../Views/confirmations/utils/transaction';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';
import { createMusdConversionTransaction } from './createMusdConversionTransaction';
import { replaceMusdConversionTransactionForPayToken } from './replaceMusdConversionTransactionForPayToken';

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

jest.mock('./createMusdConversionTransaction', () => ({
  createMusdConversionTransaction: jest.fn(),
}));

type MockedFindNetworkClientIdByChainId = (chainId: Hex) => string | undefined;

interface MockedEngineContext {
  GasFeeController: {
    fetchGasFeeEstimates: jest.Mock<
      Promise<unknown>,
      [{ networkClientId?: string }]
    >;
  };
  TransactionPayController: {
    updatePaymentToken: jest.Mock<
      void,
      [{ transactionId: string; tokenAddress: Hex; chainId: Hex }]
    >;
  };
  ApprovalController: {
    reject: jest.Mock<void, [string, unknown]>;
  };
  NetworkController: {
    findNetworkClientIdByChainId: jest.MockedFunction<MockedFindNetworkClientIdByChainId>;
  };
}

const mockedProviderErrors = providerErrors as jest.Mocked<
  typeof providerErrors
>;
const mockedEngineService = EngineService as jest.Mocked<typeof EngineService>;
const mockedEngine = Engine as unknown as { context: MockedEngineContext };
const mockedGetTokenTransferData = getTokenTransferData as jest.MockedFunction<
  typeof getTokenTransferData
>;
const mockedParseStandardTokenTransactionData =
  parseStandardTokenTransactionData as jest.MockedFunction<
    typeof parseStandardTokenTransactionData
  >;
const mockedCreateMusdConversionTransaction =
  createMusdConversionTransaction as jest.MockedFunction<
    typeof createMusdConversionTransaction
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

describe('replaceMusdConversionTransactionForPayToken', () => {
  let consoleErrorSpy: jest.SpyInstance<void, unknown[]>;

  const gasFeeControllerFetchGasFeeEstimates = jest.fn<
    Promise<unknown>,
    [{ networkClientId?: string }]
  >();
  const transactionPayControllerUpdatePaymentToken = jest.fn<
    void,
    [{ transactionId: string; tokenAddress: Hex; chainId: Hex }]
  >();
  const approvalControllerReject = jest.fn<void, [string, unknown]>();
  const networkControllerFindNetworkClientIdByChainId = jest.fn<
    string | undefined,
    [Hex]
  >();

  beforeEach(() => {
    jest.clearAllMocks();

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty for test output.
    });

    mockedEngine.context = {
      GasFeeController: {
        fetchGasFeeEstimates: gasFeeControllerFetchGasFeeEstimates,
      },
      TransactionPayController: {
        updatePaymentToken: transactionPayControllerUpdatePaymentToken,
      },
      ApprovalController: {
        reject: approvalControllerReject,
      },
      NetworkController: {
        findNetworkClientIdByChainId:
          networkControllerFindNetworkClientIdByChainId,
      },
    };

    (MUSD_TOKEN_ADDRESS_BY_CHAIN as Record<string, Hex>)['0x1'] =
      '0xmusdTokenAddress';

    networkControllerFindNetworkClientIdByChainId.mockReturnValue(
      'networkClientId',
    );

    gasFeeControllerFetchGasFeeEstimates.mockResolvedValue(undefined);

    mockedProviderErrors.userRejectedRequest.mockReturnValue({
      name: 'userRejectedRequest',
      code: 4001,
      message: 'User rejected the request.',
      serialize: jest.fn(),
    });

    mockedCreateMusdConversionTransaction.mockResolvedValue({
      transactionId: '0xnewTransactionId',
    });

    mockedGetTokenTransferData.mockReturnValue({
      data: '0xtransferData' as Hex,
      to: '0x0000000000000000000000000000000000000000' as Hex,
    } as unknown as ReturnType<typeof getTokenTransferData>);
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
      replaceMusdConversionTransactionForPayToken(transactionMeta, newPayToken),
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
      replaceMusdConversionTransactionForPayToken(transactionMeta, newPayToken),
    ).rejects.toThrow(
      '[mUSD Conversion] Missing transaction metadata for replacement',
    );
  });

  it('throws when mUSD is not supported on selected chain', async () => {
    const transactionMeta = createTransactionMeta();
    const newPayToken = createPayTokenSelection({ chainId: '0x1234' });

    await expect(
      replaceMusdConversionTransactionForPayToken(transactionMeta, newPayToken),
    ).rejects.toThrow(
      '[mUSD Conversion] mUSD not supported on selected chain: 0x1234',
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

    const newTransactionId = await replaceMusdConversionTransactionForPayToken(
      transactionMeta,
      newPayToken,
    );

    expect(mockedCreateMusdConversionTransaction).toHaveBeenCalledWith({
      outputChainId: '0x1',
      fromAddress: '0xfromAddress',
      recipientAddress: '0xrecipientFromParsed',
      amountHex: '0x2a',
    });

    expect(networkControllerFindNetworkClientIdByChainId).toHaveBeenCalledWith(
      '0x1',
    );
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

    await replaceMusdConversionTransactionForPayToken(
      transactionMeta,
      newPayToken,
    );

    expect(mockedCreateMusdConversionTransaction).toHaveBeenCalledWith({
      outputChainId: '0x1',
      fromAddress: '0xfromAddressFallback',
      recipientAddress: '0xfromAddressFallback',
      amountHex: '0x01',
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

    await replaceMusdConversionTransactionForPayToken(
      transactionMeta,
      newPayToken,
    );

    expect(mockedCreateMusdConversionTransaction).toHaveBeenCalledWith({
      outputChainId: '0x1',
      fromAddress: '0xfromAddress',
      recipientAddress: '0xrecipientAddress',
      amountHex: '0x123',
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

    await replaceMusdConversionTransactionForPayToken(
      transactionMeta,
      newPayToken,
    );

    expect(mockedCreateMusdConversionTransaction).toHaveBeenCalledWith({
      outputChainId: '0x1',
      fromAddress: '0xfromAddress',
      recipientAddress: '0xrecipientAddress',
      amountHex: '0x0',
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

    const newTransactionId = await replaceMusdConversionTransactionForPayToken(
      transactionMeta,
      newPayToken,
    );

    expect(transactionPayControllerUpdatePaymentToken).toHaveBeenCalledTimes(1);
    expect(approvalControllerReject).toHaveBeenCalledTimes(1);
    expect(newTransactionId).toBe('0xnewTransactionId');
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
    mockedCreateMusdConversionTransaction.mockRejectedValueOnce(
      new Error('transaction create failed'),
    );

    const newTransactionId = await replaceMusdConversionTransactionForPayToken(
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
