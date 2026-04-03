import {
  GasFeeEstimateType,
  WalletDevice,
  type TransactionMeta,
  TransactionEnvelopeType,
  IsAtomicBatchSupportedRequest,
} from '@metamask/transaction-controller';
import { cloneDeep } from 'lodash';
//eslint-disable-next-line import-x/no-namespace
import * as TransactionControllerUtils from './index';
import Engine from '../../core/Engine';
import { store } from '../../store';
import { RootState } from '../../reducers';
import { Hex } from '@metamask/utils';
import { checkIsValidTempoTransaction } from '../tempo/tempo-tx-utils';
import { accountSupports7702 } from '../transactions/account-supports-7702';

jest.mock('../tempo/tempo-tx-utils', () => ({
  ...jest.requireActual('../tempo/tempo-tx-utils'),
  checkIsValidTempoTransaction: jest.fn(),
}));

const {
  addTransaction,
  estimateGas,
  getNetworkNonce,
  estimateGasFee,
  getPreviousGasFromController,
  getChainIdFromNetworkClientId,
  ...proxyMethods
} = TransactionControllerUtils;

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(() => ({
      settings: { basicFunctionalityEnabled: true },
    })),
  },
}));

jest.mock('../transactions/account-supports-7702', () => ({
  accountSupports7702: jest.fn().mockResolvedValue(true),
}));

const ID_MOCK = 'testId';

const EIP_1559_TRANSACTION_PARAMS_MOCK = {
  from: '0x1559From',
  to: '0x1559To',
  value: '0x1559Value',
  type: TransactionEnvelopeType.feeMarket,
  gas: '0x1559Gas',
  maxFeePerGas: '0x1559MaxFeePerGas',
  maxPriorityFeePerGas: '0x1559MaxPriorityFeePerGas',
};

const LEGACY_TRANSACTION_PARAMS_MOCK = {
  from: '0xlegacyFrom',
  to: '0xlegacyTo',
  value: '0xlegacyValue',
  type: TransactionEnvelopeType.legacy,
  gas: '0xlegacyGas',
  gasPrice: '0xlegacyGasPrice',
};

const NETWORK_CLIENT_ID_MOCK = 'testNetworkClientId';

const EIP1559_TRANSACTION_META_MOCK = {
  id: ID_MOCK,
  txParams: EIP_1559_TRANSACTION_PARAMS_MOCK,
} as TransactionMeta;

const GAS_PRICE_MOCK = '0x1234';
const EIP1559_TRANSACTION_META_MOCK_WITH_GAS_FEE_ESTIMATES = {
  ...EIP1559_TRANSACTION_META_MOCK,
  gasFeeEstimates: {
    type: GasFeeEstimateType.GasPrice,
    gasPrice: GAS_PRICE_MOCK,
  },
} as unknown as TransactionMeta;

const LEGACY_TRANSACTION_META_MOCK = {
  id: ID_MOCK,
  txParams: LEGACY_TRANSACTION_PARAMS_MOCK,
} as TransactionMeta;

const TRANSACTION_OPTIONS_MOCK = {
  deviceConfirmedOn: WalletDevice.MM_MOBILE,
  networkClientId: NETWORK_CLIENT_ID_MOCK,
  origin: 'origin',
};

const TEMPO_VALID_CHAIN_ID = '0xa5bf' as Hex;
const BATCHID_MOCK = '0xmockBatchId' as Hex;
const FROM_FIELD_MOCK = '0x1';

const TEMPO_VALID_CALLS_FIELD_MOCK = [
  {
    data: '0xa9059cbb0000000000000000000000002367e6eca6e1fcc2d112133c896e3bddad375aff000000000000000000000000000000000000000000000000002386f26fc10000',
    to: '0x86fA047df5b69df0CBD6dF566F1468756dCF339D',
    value: '0x',
  },
  {
    data: '0xa9059cbb0000000000000000000000001e3abc74428056924ceee2f45f060879c3f063ed000000000000000000000000000000000000000000000000002386f26fc10000',
    to: '0x86fA047df5b69df0CBD6dF566F1468756dCF339D',
    value: '0x',
  },
];

const TEMPO_EXPECTED_TRANSACTIONS_FOR_VALID_CALLS_FIELD = [
  {
    params: {
      data: '0xa9059cbb0000000000000000000000002367e6eca6e1fcc2d112133c896e3bddad375aff000000000000000000000000000000000000000000000000002386f26fc10000',
      to: '0x86fA047df5b69df0CBD6dF566F1468756dCF339D',
      value: '0x0',
    },
  },
  {
    params: {
      data: '0xa9059cbb0000000000000000000000001e3abc74428056924ceee2f45f060879c3f063ed000000000000000000000000000000000000000000000000002386f26fc10000',
      to: '0x86fA047df5b69df0CBD6dF566F1468756dCF339D',
      value: '0x0',
    },
  },
];

const TEMPO_FEE_TOKEN_MOCK = '0xtempoFeeToken';

const TEMPO_TRANSACTION_PARAMS_MOCK = {
  type: '0x76' as const,
  from: FROM_FIELD_MOCK,
  feeToken: TEMPO_FEE_TOKEN_MOCK,
  calls: TEMPO_VALID_CALLS_FIELD_MOCK,
};

const BATCH_TRANSACTION_META_MOCK: TransactionMeta = {
  id: 'batchTestId',
  hash: 'batchTestHash',
  batchId: BATCHID_MOCK,
} as TransactionMeta;

jest.mock('../../core/Engine', () => ({
  context: {
    TransactionController: {
      getTransactions: jest.fn(),
      addTransaction: jest.fn(),
      estimateGas: jest.fn(),
      estimateGasFee: jest.fn(),

      // Proxy methods
      handleMethodData: jest.fn(),
      getNonceLock: jest.fn(),
      speedUpTransaction: jest.fn(),
      startIncomingTransactionPolling: jest.fn(),
      stopIncomingTransactionPolling: jest.fn(),
      updateIncomingTransactions: jest.fn(),
      updateSecurityAlertResponse: jest.fn(),
      updateTransaction: jest.fn(),
      wipeTransactions: jest.fn(),
      updateEditableParams: jest.fn(),
      updateTransactionGasFees: jest.fn(),
      updatePreviousGasParams: jest.fn(),
      updateAtomicBatchData: jest.fn(),
      addTransactionBatch: jest.fn(),
      updateSelectedGasFeeToken: jest.fn(),
      updateRequiredTransactionIds: jest.fn(),
      isAtomicBatchSupported: jest.fn(),
    },
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
  },
}));

describe('Transaction Controller Util', () => {
  beforeEach(() => {
    jest
      .mocked(
        Engine.context.NetworkController
          .getNetworkConfigurationByNetworkClientId,
      )
      .mockReturnValue({
        chainId: '0x1',
        blockExplorerUrls: [],
        defaultRpcEndpointIndex: 0,
        name: 'Ethereum Mainnet',
        nativeCurrency: 'ETH',
        rpcEndpoints: [],
      });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addTransaction', () => {
    it('should call addTransaction with correct parameters', async () => {
      await addTransaction(
        EIP_1559_TRANSACTION_PARAMS_MOCK,
        TRANSACTION_OPTIONS_MOCK,
      );

      expect(
        Engine.context.TransactionController.addTransaction,
      ).toHaveBeenCalledWith(
        EIP_1559_TRANSACTION_PARAMS_MOCK,
        TRANSACTION_OPTIONS_MOCK,
      );
    });
  });

  describe('addTransaction when transacton is from Tempo chain', () => {
    beforeEach(() => {
      jest
        .mocked(
          Engine.context.NetworkController
            .getNetworkConfigurationByNetworkClientId,
        )
        .mockReturnValue({
          chainId: TEMPO_VALID_CHAIN_ID,
          blockExplorerUrls: [],
          defaultRpcEndpointIndex: 0,
          name: 'Tempo Testnet',
          nativeCurrency: 'USD',
          rpcEndpoints: [],
        });
    });

    it('calls regular addTransaction with extra params when transaction is NOT type 0x76', async () => {
      jest
        .mocked(Engine.context.TransactionController.addTransactionBatch)
        .mockReturnValueOnce(
          Promise.resolve({
            batchId: BATCHID_MOCK,
          }),
        );
      jest
        .mocked(Engine.context.TransactionController.getTransactions)
        .mockReturnValueOnce([BATCH_TRANSACTION_META_MOCK]);

      await addTransaction(
        EIP_1559_TRANSACTION_PARAMS_MOCK,
        TRANSACTION_OPTIONS_MOCK,
      );
      expect(
        Engine.context.TransactionController.addTransaction,
      ).toHaveBeenCalledWith(EIP_1559_TRANSACTION_PARAMS_MOCK, {
        ...TRANSACTION_OPTIONS_MOCK,
        excludeNativeTokenForFee: true,
        gasFeeToken: '0x20c0000000000000000000000000000000000000',
      });
      expect(
        Engine.context.TransactionController.addTransactionBatch,
      ).not.toHaveBeenCalled();
    });

    it('calls addTransactionBatch when transaction is type 0x76', async () => {
      jest
        .mocked(Engine.context.TransactionController.addTransactionBatch)
        .mockReturnValueOnce(
          Promise.resolve({
            batchId: BATCHID_MOCK,
          }),
        );
      jest
        .mocked(Engine.context.TransactionController.getTransactions)
        .mockReturnValueOnce([BATCH_TRANSACTION_META_MOCK]);

      const result = await addTransaction(
        TEMPO_TRANSACTION_PARAMS_MOCK,
        TRANSACTION_OPTIONS_MOCK,
      );
      expect(
        Engine.context.TransactionController.addTransactionBatch,
      ).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.TransactionController.addTransactionBatch,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          networkClientId: TRANSACTION_OPTIONS_MOCK.networkClientId,
          origin: TRANSACTION_OPTIONS_MOCK.origin,
          from: FROM_FIELD_MOCK,
          gasFeeToken: TEMPO_FEE_TOKEN_MOCK,
          excludeNativeTokenForFee: true,
          transactions: TEMPO_EXPECTED_TRANSACTIONS_FOR_VALID_CALLS_FIELD,
        }),
      );
      expect(result).toEqual({
        result: Promise.resolve(BATCH_TRANSACTION_META_MOCK.hash),
        transactionMeta: BATCH_TRANSACTION_META_MOCK,
      });
    });

    it('does not call addTransactionBatch if type 0x76 and checkIsValidTempoTransaction throws', async () => {
      (checkIsValidTempoTransaction as jest.Mock).mockImplementation(() => {
        throw new Error('Tempo Transaction: Mock error');
      });
      await expect(
        addTransaction(TEMPO_TRANSACTION_PARAMS_MOCK, TRANSACTION_OPTIONS_MOCK),
      ).rejects.toThrow();
      expect(
        Engine.context.TransactionController.addTransactionBatch,
      ).not.toHaveBeenCalled();
      expect(
        Engine.context.TransactionController.getTransactions,
      ).not.toHaveBeenCalled();
    });

    it('does not call addTransactionBatch if accountSupports7702 resolves to false', async () => {
      (accountSupports7702 as jest.Mock).mockResolvedValueOnce(false);
      await expect(
        addTransaction(TEMPO_TRANSACTION_PARAMS_MOCK, TRANSACTION_OPTIONS_MOCK),
      ).rejects.toThrow(`Wallet not supported for Tempo Transactions.`);
      expect(
        Engine.context.TransactionController.addTransactionBatch,
      ).not.toHaveBeenCalled();
      expect(
        Engine.context.TransactionController.getTransactions,
      ).not.toHaveBeenCalled();
    });
  });

  describe('estimateGas', () => {
    it('should call estimateGas with correct parameters', async () => {
      await estimateGas(
        EIP_1559_TRANSACTION_PARAMS_MOCK,
        NETWORK_CLIENT_ID_MOCK,
      );

      expect(
        Engine.context.TransactionController.estimateGas,
      ).toHaveBeenCalledWith(
        EIP_1559_TRANSACTION_PARAMS_MOCK,
        NETWORK_CLIENT_ID_MOCK,
      );
    });
  });

  describe('estimateGasFee', () => {
    it('should call estimateGasFee with correct parameters', async () => {
      await estimateGasFee({
        transactionParams: EIP_1559_TRANSACTION_PARAMS_MOCK,
        chainId: '0x1',
      });

      expect(
        Engine.context.TransactionController.estimateGasFee,
      ).toHaveBeenCalledWith({
        transactionParams: EIP_1559_TRANSACTION_PARAMS_MOCK,
        chainId: '0x1',
      });
    });
  });

  describe('proxy methods', () => {
    it('should call Transaction controller API methods', () => {
      const proxyMethodsKeys = Object.keys(proxyMethods);
      proxyMethodsKeys.forEach((key) => {
        const proxyMethod = proxyMethods[key as keyof typeof proxyMethods];
        // This is to avoid type errors when calling the proxy method, no type can be inferred as this is existence check
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        proxyMethod({} as any);
        expect(
          Engine.context.TransactionController[
            key as keyof typeof proxyMethods
          ],
        ).toHaveBeenCalled();
      });
    });
  });

  describe('startIncomingTransactionPolling', () => {
    it('should call Transaction controller API method if privacy mode is not enabled', () => {
      TransactionControllerUtils.startIncomingTransactionPolling();
      expect(
        Engine.context.TransactionController.startIncomingTransactionPolling,
      ).toHaveBeenCalled();
    });

    it('should not call Transaction controller API method if privacy mode is enabled', () => {
      jest.spyOn(store, 'getState').mockReturnValue({
        settings: { basicFunctionalityEnabled: false },
      } as RootState);
      TransactionControllerUtils.startIncomingTransactionPolling();
      expect(
        Engine.context.TransactionController.startIncomingTransactionPolling,
      ).not.toHaveBeenCalled();
    });
  });

  describe('updateIncomingTransactions', () => {
    it('should call Transaction controller API method is privacy mode is not enabled', () => {
      jest.spyOn(store, 'getState').mockReturnValue({
        settings: { basicFunctionalityEnabled: true },
      } as RootState);
      TransactionControllerUtils.updateIncomingTransactions();
      expect(
        Engine.context.TransactionController.updateIncomingTransactions,
      ).toHaveBeenCalled();
    });

    it('should not call Transaction controller API method is privacy mode is enabled', () => {
      jest.spyOn(store, 'getState').mockReturnValue({
        settings: { basicFunctionalityEnabled: false },
      } as RootState);
      TransactionControllerUtils.updateIncomingTransactions();
      expect(
        Engine.context.TransactionController.updateIncomingTransactions,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getNetworkNonce', () => {
    const nonceMock = 123;
    const fromMock = '0x123';
    const networkClientIdMock = 'testNetworkClientId';

    beforeEach(() => {
      jest.spyOn(Engine.context.TransactionController, 'getNonceLock');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns value from TransactionController', async () => {
      (
        Engine.context.TransactionController.getNonceLock as jest.Mock
      ).mockResolvedValueOnce({
        nextNonce: nonceMock,
        releaseLock: jest.fn(),
      });

      expect(
        await TransactionControllerUtils.getNetworkNonce(
          { from: fromMock },
          networkClientIdMock,
        ),
      ).toBe(nonceMock);

      expect(
        Engine.context.TransactionController.getNonceLock,
      ).toHaveBeenCalledWith(fromMock, networkClientIdMock);
    });

    it('releases nonce lock', async () => {
      const releaseLockMock = jest.fn();

      (
        Engine.context.TransactionController.getNonceLock as jest.Mock
      ).mockResolvedValueOnce({
        nextNonce: nonceMock,
        releaseLock: releaseLockMock,
      });

      await TransactionControllerUtils.getNetworkNonce(
        { from: fromMock },
        networkClientIdMock,
      );

      expect(releaseLockMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Gas property sanitization', () => {
    function testSanitization<Params extends unknown[]>({
      expectedCallArgumentIndex = 0,
      paramToSanitize = [],
      testName,
      transactionMock,
      updaterFunction,
      updaterFunctionName,
      updaterFunctionParams,
    }: {
      expectedCallArgumentIndex?: number;
      paramToSanitize?: string[];
      testName: string;
      transactionMock: TransactionMeta;
      updaterFunction: (...args: Params) => void;
      updaterFunctionName: 'updateTransaction' | 'updateEditableParams';
      updaterFunctionParams: Params;
    }) {
      it(testName, () => {
        const clonedUpdaterFunctionParams = cloneDeep(updaterFunctionParams);

        mockGetTransactions([transactionMock]);

        updaterFunction(...clonedUpdaterFunctionParams);

        const calledTxParams = (
          Engine.context.TransactionController?.[
            updaterFunctionName as keyof typeof Engine.context.TransactionController
          ] as jest.Mock
        ).mock.calls[0][expectedCallArgumentIndex];

        // Either check txParams or the whole object
        const calledTxParamsArguments =
          calledTxParams?.txParams || calledTxParams;

        paramToSanitize.forEach((param: string) => {
          expect(calledTxParamsArguments[param]).not.toBeDefined();
        });

        expect(calledTxParamsArguments.type).toBe(
          transactionMock.txParams.type,
        );
      });
    }

    function mockGetTransactions(transactions: TransactionMeta[]) {
      jest
        .spyOn(Engine.context.TransactionController, 'getTransactions')
        .mockReturnValue(transactions);
    }

    describe('updates 1559 gas properties when gasPrice estimation is used', () => {
      it('uses requestedTransactionParamsToUpdate values if provided', () => {
        const customMaxFeePerGas = '0x5678';
        const customMaxPriorityFeePerGas = '0x9abc';

        mockGetTransactions([
          EIP1559_TRANSACTION_META_MOCK_WITH_GAS_FEE_ESTIMATES,
        ]);

        TransactionControllerUtils.updateTransaction(
          {
            id: ID_MOCK,
            txParams: {
              ...EIP_1559_TRANSACTION_PARAMS_MOCK,
              maxFeePerGas: customMaxFeePerGas,
              maxPriorityFeePerGas: customMaxPriorityFeePerGas,
            },
          } as TransactionMeta,
          'testNote',
        );

        const updatedParams = (
          Engine.context.TransactionController.updateTransaction as jest.Mock
        ).mock.calls[0][0].txParams;
        expect(updatedParams.maxFeePerGas).toBe(customMaxFeePerGas);
        expect(updatedParams.maxPriorityFeePerGas).toBe(
          customMaxPriorityFeePerGas,
        );
      });

      it('falls back to existing txParams values if requested values are not provided', () => {
        const existingMaxFeePerGas = '0xabcd';
        const existingMaxPriorityFeePerGas = '0xef01';

        // Create transaction meta with txParams and gasPrice estimation
        const transactionWithExistingParams = {
          ...EIP1559_TRANSACTION_META_MOCK_WITH_GAS_FEE_ESTIMATES,
          txParams: {
            ...EIP_1559_TRANSACTION_PARAMS_MOCK,
            maxFeePerGas: existingMaxFeePerGas,
            maxPriorityFeePerGas: existingMaxPriorityFeePerGas,
          },
        } as unknown as TransactionMeta;

        mockGetTransactions([transactionWithExistingParams]);

        // Call without fee values in the requested update
        TransactionControllerUtils.updateTransaction(
          {
            id: ID_MOCK,
            txParams: {
              ...EIP_1559_TRANSACTION_PARAMS_MOCK,
              maxFeePerGas: undefined,
              maxPriorityFeePerGas: undefined,
            },
          } as TransactionMeta,
          'testNote',
        );

        // Verify fallback to existing txParams values
        const updatedParams = (
          Engine.context.TransactionController.updateTransaction as jest.Mock
        ).mock.calls[0][0].txParams;
        expect(updatedParams.maxFeePerGas).toBe(existingMaxFeePerGas);
        expect(updatedParams.maxPriorityFeePerGas).toBe(
          existingMaxPriorityFeePerGas,
        );
      });

      it('falls back to gasPrice estimation if neither requested nor existing values are available', () => {
        // Create transaction meta with only gasPrice estimation
        const transactionWithOnlyGasPriceEstimate = {
          ...EIP1559_TRANSACTION_META_MOCK_WITH_GAS_FEE_ESTIMATES,
          txParams: {
            ...EIP_1559_TRANSACTION_PARAMS_MOCK,
            maxFeePerGas: undefined,
            maxPriorityFeePerGas: undefined,
          },
        } as TransactionMeta;

        mockGetTransactions([transactionWithOnlyGasPriceEstimate]);

        // Call without fee values
        TransactionControllerUtils.updateTransaction(
          {
            id: ID_MOCK,
            txParams: {
              ...EIP_1559_TRANSACTION_PARAMS_MOCK,
              maxFeePerGas: undefined,
              maxPriorityFeePerGas: undefined,
            },
          } as TransactionMeta,
          'testNote',
        );

        // Verify fallback to gasPrice estimation
        const updatedParams = (
          Engine.context.TransactionController.updateTransaction as jest.Mock
        ).mock.calls[0][0].txParams;
        expect(updatedParams.maxFeePerGas).toBe(GAS_PRICE_MOCK);
        expect(updatedParams.maxPriorityFeePerGas).toBe(GAS_PRICE_MOCK);
      });

      it('does not update 1559 gas properties when gasPrice estimation is not used', () => {
        // Create transaction meta without gasPrice estimation
        const transactionWithoutGasPriceEstimate = {
          ...EIP1559_TRANSACTION_META_MOCK_WITH_GAS_FEE_ESTIMATES,
          gasFeeEstimates: {
            type: 'fee-market', // Not gasPrice
            someOtherProperty: 'value',
          },
        } as unknown as TransactionMeta;

        mockGetTransactions([transactionWithoutGasPriceEstimate]);

        TransactionControllerUtils.updateTransaction(
          {
            id: ID_MOCK,
            txParams: {
              ...EIP_1559_TRANSACTION_PARAMS_MOCK,
            },
          } as unknown as TransactionMeta,
          'testNote',
        );

        // Verify that the transaction was passed as is
        const updatedParams = (
          Engine.context.TransactionController.updateTransaction as jest.Mock
        ).mock.calls[0][0].txParams;
        expect(updatedParams).toEqual(EIP_1559_TRANSACTION_PARAMS_MOCK);
      });
    });

    describe('does not modify transaction params', () => {
      it('when transaction is not exist', () => {
        mockGetTransactions([]);

        TransactionControllerUtils.updateTransaction(
          EIP1559_TRANSACTION_META_MOCK,
          'testNote',
        );

        expect(
          Engine.context.TransactionController.updateTransaction,
        ).toHaveBeenCalledWith(EIP1559_TRANSACTION_META_MOCK, 'testNote');

        TransactionControllerUtils.updateEditableParams(
          ID_MOCK,
          EIP_1559_TRANSACTION_PARAMS_MOCK,
        );

        expect(
          Engine.context.TransactionController.updateEditableParams,
        ).toHaveBeenCalledWith(ID_MOCK, EIP_1559_TRANSACTION_PARAMS_MOCK);
      });

      it('when requested transaction params changes does not exist', () => {
        mockGetTransactions([EIP1559_TRANSACTION_META_MOCK]);

        TransactionControllerUtils.updateTransaction(
          { id: ID_MOCK } as TransactionMeta,
          'testNote',
        );

        expect(
          Engine.context.TransactionController.updateTransaction,
        ).toHaveBeenCalledWith({ id: ID_MOCK } as TransactionMeta, 'testNote');

        TransactionControllerUtils.updateEditableParams(
          ID_MOCK,
          undefined as unknown as Parameters<
            typeof TransactionControllerUtils.updateEditableParams
          >[1],
        );

        expect(
          Engine.context.TransactionController.updateEditableParams,
        ).toHaveBeenCalledWith(
          ID_MOCK,
          undefined as unknown as Parameters<
            typeof TransactionControllerUtils.updateEditableParams
          >[1],
        );
      });

      it('when transaction type is not legacy or feeMarket', () => {
        mockGetTransactions([
          {
            ...EIP1559_TRANSACTION_META_MOCK,
            txParams: {
              ...EIP_1559_TRANSACTION_PARAMS_MOCK,
              type: '0x4',
            },
          },
        ]);

        TransactionControllerUtils.updateTransaction(
          EIP1559_TRANSACTION_META_MOCK,
          'testNote',
        );

        expect(
          Engine.context.TransactionController.updateTransaction,
        ).toHaveBeenCalledWith(EIP1559_TRANSACTION_META_MOCK, 'testNote');

        TransactionControllerUtils.updateEditableParams(
          ID_MOCK,
          EIP_1559_TRANSACTION_PARAMS_MOCK,
        );

        expect(
          Engine.context.TransactionController.updateEditableParams,
        ).toHaveBeenCalledWith(ID_MOCK, EIP_1559_TRANSACTION_PARAMS_MOCK);
      });
    });

    testSanitization({
      expectedCallArgumentIndex: 0,
      paramToSanitize: ['maxFeePerGas', 'maxPriorityFeePerGas'],
      testName:
        'updateTransaction removes maxFeePerGas and maxPriorityFeePerGas values for legacy transactions',
      transactionMock: LEGACY_TRANSACTION_META_MOCK,
      updaterFunction: TransactionControllerUtils.updateTransaction,
      updaterFunctionName: 'updateTransaction',
      updaterFunctionParams: [EIP1559_TRANSACTION_META_MOCK, 'testNote'],
    });

    testSanitization({
      expectedCallArgumentIndex: 0,
      paramToSanitize: ['gasPrice'],
      testName: 'updateTransaction removes gasPrice for EIP-1559 transactions',
      transactionMock: EIP1559_TRANSACTION_META_MOCK,
      updaterFunction: TransactionControllerUtils.updateTransaction,
      updaterFunctionName: 'updateTransaction',
      updaterFunctionParams: [EIP1559_TRANSACTION_META_MOCK, 'testNote'],
    });

    testSanitization({
      expectedCallArgumentIndex: 1,
      paramToSanitize: ['maxFeePerGas', 'maxPriorityFeePerGas'],
      testName:
        'updateEditableParams removes maxFeePerGas and maxPriorityFeePerGas values for legacy transactions',
      transactionMock: LEGACY_TRANSACTION_META_MOCK,
      updaterFunction: TransactionControllerUtils.updateEditableParams,
      updaterFunctionName: 'updateEditableParams',
      updaterFunctionParams: [ID_MOCK, EIP_1559_TRANSACTION_PARAMS_MOCK],
    });

    testSanitization({
      expectedCallArgumentIndex: 1,
      paramToSanitize: ['gasPrice'],
      testName:
        'updateEditableParams removes gasPrice for EIP-1559 transactions',
      transactionMock: EIP1559_TRANSACTION_META_MOCK,
      updaterFunction: TransactionControllerUtils.updateEditableParams,
      updaterFunctionName: 'updateEditableParams',
      updaterFunctionParams: [ID_MOCK, EIP_1559_TRANSACTION_PARAMS_MOCK],
    });
  });

  describe('updateSelectedGasFeeToken', () => {
    it('calls updateSelectedGasFeeToken with transactionId and selectedGasFeeToken', () => {
      const transactionId = '0xabcdef1234567890abcdef1234567890abcdef';
      const selectedGasFeeToken = '0x1234567890abcdef1234567890abcdef12345678';
      TransactionControllerUtils.updateSelectedGasFeeToken(
        transactionId,
        selectedGasFeeToken,
      );
      expect(
        Engine.context.TransactionController.updateSelectedGasFeeToken,
      ).toHaveBeenCalledWith(transactionId, selectedGasFeeToken);
    });
  });

  describe('updatePreviousGasParams', () => {
    it('delegates to TransactionController.updatePreviousGasParams', () => {
      const transactionId = 'tx-123';
      const previousGas = {
        maxFeePerGas: '0x1',
        maxPriorityFeePerGas: '0x2',
        gasLimit: '0x5208',
      };
      TransactionControllerUtils.updatePreviousGasParams(
        transactionId,
        previousGas,
      );
      expect(
        Engine.context.TransactionController.updatePreviousGasParams,
      ).toHaveBeenCalledWith(transactionId, previousGas);
    });
  });

  describe('isAtomicBatchSupported', () => {
    it('calls isAtomicBatchSupported with the request object and returns the result', async () => {
      const request = {
        chainId: '0x1',
        address: '0x1234567890abcdef1234567890abcdef12345678',
      } as IsAtomicBatchSupportedRequest;
      const mockResult = { isSupported: true, reason: '' };
      (
        Engine.context.TransactionController.isAtomicBatchSupported as jest.Mock
      ).mockResolvedValueOnce(mockResult);

      const result =
        await TransactionControllerUtils.isAtomicBatchSupported(request);

      expect(
        Engine.context.TransactionController.isAtomicBatchSupported,
      ).toHaveBeenCalledWith(request);
      expect(result).toBe(mockResult);
    });
  });
});
