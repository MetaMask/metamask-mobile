import { renderHook } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import { TransactionPayStrategy } from '@metamask/transaction-pay-controller';
import { useMusdConversionQuoteTrace } from './useMusdConversionQuoteTrace';
import { trace, TraceName, TraceOperation } from '../../../../util/trace';
import {
  useIsTransactionPayQuoteLoading,
  useTransactionPayQuotes,
  useTransactionPaySourceAmounts,
} from '../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    MusdConversionQuote: 'mUSD Conversion Quote',
  },
  TraceOperation: {
    MusdConversionDataFetch: 'musd.conversion.data_fetch',
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-trace-id'),
}));

jest.mock('../../../Views/confirmations/hooks/pay/useTransactionPayData');
jest.mock(
  '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
);
jest.mock('../../../Views/confirmations/hooks/pay/useTransactionPayToken');

const mockTrace = trace as jest.MockedFunction<typeof trace>;
const mockUseIsTransactionPayQuoteLoading = jest.mocked(
  useIsTransactionPayQuoteLoading,
);
const mockUseTransactionPayQuotes = jest.mocked(useTransactionPayQuotes);
const mockUseTransactionPaySourceAmounts = jest.mocked(
  useTransactionPaySourceAmounts,
);
const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);
const mockUseTransactionPayToken = jest.mocked(useTransactionPayToken);

describe('useMusdConversionQuoteTrace', () => {
  const setupMuSDConversionContext = () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      id: 'test-transaction-id',
      type: TransactionType.musdConversion,
    } as ReturnType<typeof useTransactionMetadataRequest>);
    mockUseTransactionPayToken.mockReturnValue({
      payToken: {
        address: '0xtoken',
        chainId: '0x1',
      },
    } as ReturnType<typeof useTransactionPayToken>);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseIsTransactionPayQuoteLoading.mockReturnValue(false);
    mockUseTransactionPayQuotes.mockReturnValue([]);
    mockUseTransactionPaySourceAmounts.mockReturnValue([]);
    setupMuSDConversionContext();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('trace start conditions', () => {
    it('starts trace when sourceAmounts transition from empty to populated', () => {
      const { rerender } = renderHook(() => useMusdConversionQuoteTrace());

      expect(mockTrace).not.toHaveBeenCalled();

      mockUseTransactionPaySourceAmounts.mockReturnValue([{ amount: '100' }]);
      rerender();

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.MusdConversionQuote,
        op: TraceOperation.MusdConversionDataFetch,
        id: 'mock-trace-id',
        tags: {
          transactionId: 'test-transaction-id',
          payTokenAddress: '0xtoken',
          payTokenChainId: '0x1',
        },
      });
    });

    it('does not start trace when transaction is not mUSD conversion', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        id: 'test-transaction-id',
        type: TransactionType.simpleSend,
      } as ReturnType<typeof useTransactionMetadataRequest>);

      const { rerender } = renderHook(() => useMusdConversionQuoteTrace());

      mockUseTransactionPaySourceAmounts.mockReturnValue([{ amount: '100' }]);
      rerender();

      expect(mockTrace).not.toHaveBeenCalled();
    });

    it('does not start trace when sourceAmounts already exist on mount', () => {
      mockUseTransactionPaySourceAmounts.mockReturnValue([{ amount: '100' }]);

      renderHook(() => useMusdConversionQuoteTrace());

      expect(mockTrace).not.toHaveBeenCalled();
    });

    it('does not start trace when quotes already exist', () => {
      mockUseTransactionPayQuotes.mockReturnValue([
        { strategy: TransactionPayStrategy.Relay },
      ]);

      const { rerender } = renderHook(() => useMusdConversionQuoteTrace());

      mockUseTransactionPaySourceAmounts.mockReturnValue([{ amount: '100' }]);
      rerender();

      expect(mockTrace).not.toHaveBeenCalled();
    });

    it('includes transaction metadata in trace tags', () => {
      mockUseTransactionPayToken.mockReturnValue({
        payToken: {
          address: '0xUSDC',
          chainId: '0x89',
        },
      } as ReturnType<typeof useTransactionPayToken>);
      mockUseTransactionMetadataRequest.mockReturnValue({
        id: 'custom-tx-id',
        type: TransactionType.musdConversion,
      } as ReturnType<typeof useTransactionMetadataRequest>);

      const { rerender } = renderHook(() => useMusdConversionQuoteTrace());

      mockUseTransactionPaySourceAmounts.mockReturnValue([{ amount: '500' }]);
      rerender();

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: {
            transactionId: 'custom-tx-id',
            payTokenAddress: '0xUSDC',
            payTokenChainId: '0x89',
          },
        }),
      );
    });

    it('uses unknown for missing transaction id', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.musdConversion,
      } as ReturnType<typeof useTransactionMetadataRequest>);

      const { rerender } = renderHook(() => useMusdConversionQuoteTrace());

      mockUseTransactionPaySourceAmounts.mockReturnValue([{ amount: '100' }]);
      rerender();

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({
            transactionId: 'unknown',
          }),
        }),
      );
    });

    it('uses unknown for missing pay token address', () => {
      mockUseTransactionPayToken.mockReturnValue({
        payToken: undefined,
      } as ReturnType<typeof useTransactionPayToken>);

      const { rerender } = renderHook(() => useMusdConversionQuoteTrace());

      mockUseTransactionPaySourceAmounts.mockReturnValue([{ amount: '100' }]);
      rerender();

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({
            payTokenAddress: 'unknown',
            payTokenChainId: 'unknown',
          }),
        }),
      );
    });
  });

  describe('trace isolation', () => {
    it('only starts one trace even with multiple rerender cycles', () => {
      mockUseIsTransactionPayQuoteLoading.mockReturnValue(true);

      const { rerender } = renderHook(() => useMusdConversionQuoteTrace());

      mockUseTransactionPaySourceAmounts.mockReturnValue([{ amount: '100' }]);
      rerender();
      rerender();
      rerender();

      expect(mockTrace).toHaveBeenCalledTimes(1);
    });

    it('does not restart trace after sourceAmounts changes again', () => {
      const { rerender } = renderHook(() => useMusdConversionQuoteTrace());

      // sourceAmounts appears - trace starts
      mockUseTransactionPaySourceAmounts.mockReturnValue([{ amount: '100' }]);
      rerender();

      expect(mockTrace).toHaveBeenCalledTimes(1);

      // sourceAmounts changes - should not start new trace
      mockUseTransactionPaySourceAmounts.mockReturnValue([
        { amount: '100' },
        { amount: '200' },
      ]);
      rerender();

      expect(mockTrace).toHaveBeenCalledTimes(1);
    });
  });
});
