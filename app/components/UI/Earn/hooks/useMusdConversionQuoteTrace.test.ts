import { renderHook, act } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import { TransactionPayStrategy } from '@metamask/transaction-pay-controller';
import { useMusdConversionQuoteTrace } from './useMusdConversionQuoteTrace';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import {
  useIsTransactionPayQuoteLoading,
  useTransactionPayQuotes,
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
const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;
const mockUseIsTransactionPayQuoteLoading = jest.mocked(
  useIsTransactionPayQuoteLoading,
);
const mockUseTransactionPayQuotes = jest.mocked(useTransactionPayQuotes);
const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);
const mockUseTransactionPayToken = jest.mocked(useTransactionPayToken);

const createMockQuote = (strategy: TransactionPayStrategy) =>
  ({ strategy }) as NonNullable<
    ReturnType<typeof mockUseTransactionPayQuotes>
  >[number];

describe('useMusdConversionQuoteTrace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsTransactionPayQuoteLoading.mockReturnValue(false);
    mockUseTransactionPayQuotes.mockReturnValue([]);
    mockUseTransactionMetadataRequest.mockReturnValue({
      id: 'test-tx-id',
      type: TransactionType.musdConversion,
    } as ReturnType<typeof useTransactionMetadataRequest>);
    mockUseTransactionPayToken.mockReturnValue({
      payToken: { address: '0xtoken', chainId: '0x1' },
    } as unknown as ReturnType<typeof useTransactionPayToken>);
  });

  describe('startQuoteTrace', () => {
    it('starts trace when called', () => {
      const { result } = renderHook(() => useMusdConversionQuoteTrace());

      act(() => {
        result.current.startQuoteTrace();
      });

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.MusdConversionQuote,
        op: TraceOperation.MusdConversionDataFetch,
        id: 'mock-trace-id',
        tags: {
          transactionId: 'test-tx-id',
          payTokenAddress: '0xtoken',
          payTokenChainId: '0x1',
        },
      });
    });

    it('does not start trace for non-mUSD transactions', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        id: 'test-tx-id',
        type: TransactionType.simpleSend,
      } as ReturnType<typeof useTransactionMetadataRequest>);

      const { result } = renderHook(() => useMusdConversionQuoteTrace());

      act(() => {
        result.current.startQuoteTrace();
      });

      expect(mockTrace).not.toHaveBeenCalled();
    });

    it('does not start trace twice', () => {
      const { result } = renderHook(() => useMusdConversionQuoteTrace());

      act(() => {
        result.current.startQuoteTrace();
        result.current.startQuoteTrace();
      });

      expect(mockTrace).toHaveBeenCalledTimes(1);
    });
  });

  describe('trace end - success', () => {
    it('ends trace when quotes arrive', () => {
      const { result, rerender } = renderHook(() =>
        useMusdConversionQuoteTrace(),
      );

      act(() => {
        result.current.startQuoteTrace();
      });

      mockUseTransactionPayQuotes.mockReturnValue([
        createMockQuote(TransactionPayStrategy.Relay),
      ]);
      rerender();

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.MusdConversionQuote,
        id: 'mock-trace-id',
        data: {
          success: true,
          quoteCount: 1,
          strategy: 'relay',
        },
      });
    });

    it('includes bridge strategy in trace data', () => {
      const { result, rerender } = renderHook(() =>
        useMusdConversionQuoteTrace(),
      );

      act(() => {
        result.current.startQuoteTrace();
      });

      mockUseTransactionPayQuotes.mockReturnValue([
        createMockQuote(TransactionPayStrategy.Bridge),
      ]);
      rerender();

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ strategy: 'bridge' }),
        }),
      );
    });
  });

  describe('trace end - failure', () => {
    it('ends trace when loading finishes without quotes', () => {
      const { result, rerender } = renderHook(() =>
        useMusdConversionQuoteTrace(),
      );

      act(() => {
        result.current.startQuoteTrace();
      });

      // Loading starts
      mockUseIsTransactionPayQuoteLoading.mockReturnValue(true);
      rerender();

      // Loading finishes with no quotes
      mockUseIsTransactionPayQuoteLoading.mockReturnValue(false);
      rerender();

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.MusdConversionQuote,
        id: 'mock-trace-id',
        data: {
          success: false,
          reason: 'no_quotes',
        },
      });
    });

    it('does not end trace if loading never started', () => {
      const { result, rerender } = renderHook(() =>
        useMusdConversionQuoteTrace(),
      );

      act(() => {
        result.current.startQuoteTrace();
      });

      // isLoading stays false, quotes stay empty
      rerender();

      expect(mockEndTrace).not.toHaveBeenCalled();
    });
  });
});
