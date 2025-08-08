import {
  GasFeeEstimateType,
  WalletDevice,
  type TransactionMeta,
  TransactionEnvelopeType,
} from '@metamask/transaction-controller';
import { cloneDeep } from 'lodash';
//eslint-disable-next-line import/no-namespace
import * as TransactionControllerUtils from './index';
import Engine from '../../core/Engine';
import { store } from '../../store';
import { RootState } from '../../reducers';

const {
  addTransaction,
  estimateGas,
  getNetworkNonce,
  estimateGasFee,
  ...proxyMethods
} = TransactionControllerUtils;

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(() => ({
      settings: { basicFunctionalityEnabled: true },
    })),
  },
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
      updateAtomicBatchData: jest.fn(),
      addTransactionBatch: jest.fn(),
      updateSelectedGasFeeToken: jest.fn(),
    },
  },
}));

describe('Transaction Controller Util', () => {
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
});
