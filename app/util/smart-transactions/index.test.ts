import { TransactionMeta } from '@metamask/transaction-controller';
import {
  getSmartTransactionMetricsProperties,
  getTradeTxTokenFee,
  getGasIncludedTransactionFees,
  type GasIncludedQuote,
  getIsAllowedRpcUrlForSmartTransactions,
  wipeSmartTransactions,
} from './index';
import { SmartTransactionsController } from '@metamask/smart-transactions-controller';
// eslint-disable-next-line import/no-namespace
import * as environment from '../environment';
import Engine, { type RootExtendedMessenger } from '../../core/Engine';

jest.mock('../../core/Engine', () => ({
  context: {
    SmartTransactionsController: {
      wipeSmartTransactions: jest.fn(),
    },
  },
}));

describe('Smart Transactions utils', () => {
  describe('getSmartTransactionMetricsProperties', () => {
    let smartTransactionsController: SmartTransactionsController;
    let controllerMessenger: RootExtendedMessenger;

    beforeEach(() => {
      smartTransactionsController = {
        getSmartTransactionByMinedTxHash: jest.fn(),
      } as unknown as SmartTransactionsController;
      controllerMessenger = {
        subscribe: jest.fn(),
      } as unknown as RootExtendedMessenger;
    });

    it('returns empty object if transactionMeta is undefined', async () => {
      const result = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        undefined,
        false,
        controllerMessenger,
      );
      expect(result).toEqual({});
    });

    it('returns metrics if smartTransaction is found by getSmartTransactionByMinedTxHash', async () => {
      const transactionMeta = { hash: '0x123' } as TransactionMeta;
      const smartTransaction = {
        statusMetadata: {
          timedOut: false,
          proxied: true,
        },
      };
      (
        smartTransactionsController.getSmartTransactionByMinedTxHash as jest.Mock
      ).mockReturnValue(smartTransaction);

      const result = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        false,
        controllerMessenger,
      );
      expect(result).toEqual({
        smart_transaction_timed_out: false,
        smart_transaction_proxied: true,
        is_smart_transaction: true,
      });
    });

    it('waits for smartTransaction if not found and waitForSmartTransaction is true', async () => {
      const transactionMeta = { hash: '0x123' } as TransactionMeta;
      const smartTransaction = {
        statusMetadata: {
          timedOut: true,
          proxied: false,
        },
      };
      (
        smartTransactionsController.getSmartTransactionByMinedTxHash as jest.Mock
      ).mockReturnValue(undefined);
      (controllerMessenger.subscribe as jest.Mock).mockImplementation(
        (event, callback) => {
          if (
            event ===
            'SmartTransactionsController:smartTransactionConfirmationDone'
          ) {
            setTimeout(() => callback(smartTransaction), 100);
          }
        },
      );

      const result = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        true,
        controllerMessenger,
      );
      expect(result).toEqual({
        smart_transaction_timed_out: true,
        smart_transaction_proxied: false,
        is_smart_transaction: true,
      });
    });

    it('returns empty object if smartTransaction is not found and waitForSmartTransaction is false', async () => {
      const transactionMeta = { hash: '0x123' } as TransactionMeta;
      (
        smartTransactionsController.getSmartTransactionByMinedTxHash as jest.Mock
      ).mockReturnValue(undefined);

      const result = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        false,
        controllerMessenger,
      );
      expect(result).toEqual({});
    });

    it('returns correct object if smartTransaction is found but statusMetadata is undefined', async () => {
      const transactionMeta = { hash: '0x123' } as TransactionMeta;
      const smartTransaction = {};
      (
        smartTransactionsController.getSmartTransactionByMinedTxHash as jest.Mock
      ).mockReturnValue(smartTransaction);

      const result = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        false,
        controllerMessenger,
      );
      expect(result).toEqual({ is_smart_transaction: true });
    });

    it('returns metrics if smartTransaction is found with statusMetadata', async () => {
      const transactionMeta = { hash: '0x123' } as TransactionMeta;
      const smartTransaction = {
        statusMetadata: {
          timedOut: false,
          proxied: true,
        },
      };
      (
        smartTransactionsController.getSmartTransactionByMinedTxHash as jest.Mock
      ).mockReturnValue(smartTransaction);

      const result = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        false,
        controllerMessenger,
      );
      expect(result).toEqual({
        smart_transaction_timed_out: false,
        smart_transaction_proxied: true,
        is_smart_transaction: true,
      });
    });
  });

  describe('getTradeTxTokenFee', () => {
    it('returns the token fee when the full path exists', () => {
      const mockQuote = {
        tradeTxFees: {
          fees: [
            {
              tokenFees: ['mockTokenFee'],
            },
          ],
          cancelFees: {},
          feeEstimate: '0x0',
          gasLimit: '0x0',
          gasUsed: '0x0',
        },
        approvalTxFees: null,
      } as unknown as GasIncludedQuote;

      const result = getTradeTxTokenFee(mockQuote);
      expect(result).toBe('mockTokenFee');
    });

    it('returns undefined when tradeTxFees is missing', () => {
      const mockQuote = {
        tradeTxFees: null,
        approvalTxFees: null,
      } as GasIncludedQuote;

      const result = getTradeTxTokenFee(mockQuote);
      expect(result).toBeUndefined();
    });
    it('returns undefined when fees array is empty', () => {
      const mockQuote = {
        tradeTxFees: {
          fees: [],
          cancelFees: {},
          feeEstimate: '0x0',
          gasLimit: '0x0',
          gasUsed: '0x0',
        },
        approvalTxFees: null,
      } as unknown as GasIncludedQuote;

      const result = getTradeTxTokenFee(mockQuote);
      expect(result).toBeUndefined();
    });

    it('returns undefined when tokenFees array is empty', () => {
      const mockQuote = {
        tradeTxFees: {
          fees: [
            {
              tokenFees: [],
            },
          ],
        },
      } as unknown as GasIncludedQuote;

      const result = getTradeTxTokenFee(mockQuote);
      expect(result).toBeUndefined();
    });

    it('returns undefined when tokenFees is undefined', () => {
      const mockQuote = {
        tradeTxFees: {
          fees: [{}],
        },
      } as unknown as GasIncludedQuote;

      const result = getTradeTxTokenFee(mockQuote);
      expect(result).toBeUndefined();
    });
  });

  describe('getGasIncludedTransactionFees', () => {
    it('returns transaction fees when gas is included and token fee exists', () => {
      const mockQuote = {
        tradeTxFees: {
          fees: [
            {
              tokenFees: ['mockTokenFee'],
            },
          ],
          cancelFees: {},
          feeEstimate: '0x0',
          gasLimit: '0x0',
          gasUsed: '0x0',
        },
        approvalTxFees: {
          cancelFees: {},
          feeEstimate: '0x0',
          gasLimit: '0x0',
          gasUsed: '0x0',
        },
        isGasIncludedTrade: true,
      } as unknown as GasIncludedQuote;

      const result = getGasIncludedTransactionFees(mockQuote);
      expect(result).toEqual({
        approvalTxFees: mockQuote.approvalTxFees,
        tradeTxFees: mockQuote.tradeTxFees,
      });
    });

    it('returns undefined when gas is not included', () => {
      const mockQuote = {
        tradeTxFees: {
          fees: [
            {
              tokenFees: ['mockTokenFee'],
            },
          ],
          cancelFees: {},
          feeEstimate: '0x0',
          gasLimit: '0x0',
          gasUsed: '0x0',
        },
        approvalTxFees: null,
        isGasIncludedTrade: false,
      } as unknown as GasIncludedQuote;

      const result = getGasIncludedTransactionFees(mockQuote);
      expect(result).toBeUndefined();
    });

    it('returns undefined when token fee does not exist', () => {
      const mockQuote = {
        tradeTxFees: {
          fees: [{}],
          cancelFees: {},
          feeEstimate: '0x0',
          gasLimit: '0x0',
          gasUsed: '0x0',
        },
        approvalTxFees: null,
        isGasIncludedTrade: true,
      } as unknown as GasIncludedQuote;

      const result = getGasIncludedTransactionFees(mockQuote);
      expect(result).toBeUndefined();
    });
  });

  describe('getIsAllowedRpcUrlForSmartTransactions', () => {
    let isProductionMock: jest.SpyInstance;

    beforeEach(() => {
      // Mock isProduction function before each test
      isProductionMock = jest.spyOn(environment, 'isProduction');
    });

    afterEach(() => {
      isProductionMock.mockRestore();
    });

    it('returns true for Infura URLs in production', () => {
      isProductionMock.mockReturnValue(true);
      const result = getIsAllowedRpcUrlForSmartTransactions(
        'https://mainnet.infura.io/v3/abc123',
      );
      expect(result).toBe(true);
    });

    it('returns true for Binance URLs in production', () => {
      isProductionMock.mockReturnValue(true);
      const result = getIsAllowedRpcUrlForSmartTransactions(
        'https://bsc-dataseed.binance.org/',
      );
      expect(result).toBe(true);
    });

    it('returns false for other URLs in production', () => {
      isProductionMock.mockReturnValue(true);
      const result = getIsAllowedRpcUrlForSmartTransactions(
        'https://example.com/rpc',
      );
      expect(result).toBe(false);
    });

    it('returns false for undefined URL in production', () => {
      isProductionMock.mockReturnValue(true);
      const result = getIsAllowedRpcUrlForSmartTransactions(undefined);
      expect(result).toBe(false);
    });

    it('returns true for any URL in non-production environments', () => {
      isProductionMock.mockReturnValue(false);
      const result = getIsAllowedRpcUrlForSmartTransactions(
        'https://example.com/rpc',
      );
      expect(result).toBe(true);
    });

    it('returns true for undefined URL in non-production environments', () => {
      isProductionMock.mockReturnValue(false);
      const result = getIsAllowedRpcUrlForSmartTransactions(undefined);
      expect(result).toBe(true);
    });
  });

  describe('wipeSmartTransactions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call SmartTransactionsController.wipeSmartTransactions with address and ignoreNetwork flag', () => {
      const mockWipeSmartTransactions = Engine.context
        .SmartTransactionsController.wipeSmartTransactions as jest.Mock;
      const testAddress = '0x123456789abcdef123456789abcdef123456789a';

      wipeSmartTransactions(testAddress);

      expect(mockWipeSmartTransactions).toHaveBeenCalledTimes(1);
      expect(mockWipeSmartTransactions).toHaveBeenCalledWith({
        address: testAddress,
        ignoreNetwork: true,
      });
    });
  });
});
