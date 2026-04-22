import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { QuoteMetadata, QuoteResponse } from '@metamask/bridge-controller';
import Engine from '../../../../../../core/Engine';
import { selectShouldUseSmartTransaction } from '../../../../../../selectors/smartTransactionsController';
import { withPendingTransactionActiveAbTests } from '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { useSubmitQuickBuyTx } from './useSubmitQuickBuyTx';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeStatusController: {
        submitTx: jest.fn(),
        submitIntent: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../../../selectors/smartTransactionsController', () => ({
  selectShouldUseSmartTransaction: jest.fn(),
}));

jest.mock(
  '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry',
  () => ({
    withPendingTransactionActiveAbTests: jest.fn(
      (_tests: unknown, fn: () => Promise<unknown>) => fn(),
    ),
  }),
);

const mockSubmitTx = Engine.context.BridgeStatusController
  .submitTx as jest.Mock;
const mockSubmitIntent = Engine.context.BridgeStatusController
  .submitIntent as jest.Mock;

interface MockQuote {
  quote: { intent?: unknown };
  trade: Record<string, unknown>;
  approval?: unknown;
}

// The controller's QuoteResponse/QuoteMetadata shapes are far richer than we
// need; stub just the pieces the hook reads and cast at the boundary.
const buildQuoteResponse = (
  overrides: Partial<MockQuote> = {},
): QuoteResponse & QuoteMetadata =>
  ({
    quote: { intent: undefined, ...(overrides.quote ?? {}) },
    trade: {},
    approval: undefined,
    ...overrides,
  }) as unknown as QuoteResponse & QuoteMetadata;

describe('useSubmitQuickBuyTx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockImplementation(
      (selector: (state: unknown) => unknown) => selector({}),
    );
    (selectShouldUseSmartTransaction as unknown as jest.Mock).mockReturnValue(
      false,
    );
  });

  it('throws when no wallet address is provided', async () => {
    const { result } = renderHook(() =>
      useSubmitQuickBuyTx({ walletAddress: undefined }),
    );

    await expect(
      result.current.submitQuickBuyTx({
        quoteResponse: buildQuoteResponse(),
      }),
    ).rejects.toThrow('Wallet address is not set');
  });

  it('calls BridgeStatusController.submitTx for non-intent quotes', async () => {
    mockSubmitTx.mockResolvedValue({ id: 'tx-1' });

    const { result } = renderHook(() =>
      useSubmitQuickBuyTx({ walletAddress: '0xWALLET' }),
    );

    const quoteResponse = buildQuoteResponse();
    await result.current.submitQuickBuyTx({ quoteResponse });

    expect(mockSubmitTx).toHaveBeenCalledTimes(1);
    expect(mockSubmitTx).toHaveBeenCalledWith(
      '0xWALLET',
      { ...quoteResponse, approval: undefined },
      false, // stxEnabled
      undefined,
      undefined,
    );
    expect(mockSubmitIntent).not.toHaveBeenCalled();
  });

  it('routes intent quotes to BridgeStatusController.submitIntent', async () => {
    mockSubmitIntent.mockResolvedValue({ id: 'intent-1' });

    const { result } = renderHook(() =>
      useSubmitQuickBuyTx({ walletAddress: '0xWALLET' }),
    );

    const quoteResponse = buildQuoteResponse({
      quote: { intent: { some: 'payload' } },
    });
    await result.current.submitQuickBuyTx({ quoteResponse });

    expect(mockSubmitIntent).toHaveBeenCalledTimes(1);
    expect(mockSubmitIntent).toHaveBeenCalledWith({
      quoteResponse,
      accountAddress: '0xWALLET',
      location: undefined,
    });
    expect(mockSubmitTx).not.toHaveBeenCalled();
  });

  it('passes the smart-transaction flag through to submitTx', async () => {
    mockSubmitTx.mockResolvedValue({ id: 'tx-2' });
    (selectShouldUseSmartTransaction as unknown as jest.Mock).mockReturnValue(
      true,
    );

    const { result } = renderHook(() =>
      useSubmitQuickBuyTx({ walletAddress: '0xWALLET' }),
    );

    await result.current.submitQuickBuyTx({
      quoteResponse: buildQuoteResponse(),
    });

    expect(mockSubmitTx).toHaveBeenCalledWith(
      '0xWALLET',
      expect.any(Object),
      true, // stxEnabled
      undefined,
      undefined,
    );
  });

  it('wraps the submit in withPendingTransactionActiveAbTests with no active tests', async () => {
    mockSubmitTx.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useSubmitQuickBuyTx({ walletAddress: '0xWALLET' }),
    );

    await result.current.submitQuickBuyTx({
      quoteResponse: buildQuoteResponse(),
    });

    expect(withPendingTransactionActiveAbTests).toHaveBeenCalledTimes(1);
    expect(withPendingTransactionActiveAbTests).toHaveBeenCalledWith(
      undefined,
      expect.any(Function),
    );
  });
});
