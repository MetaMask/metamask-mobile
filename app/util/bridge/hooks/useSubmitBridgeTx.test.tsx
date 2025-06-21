import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import useSubmitBridgeTx from './useSubmitBridgeTx';
import {
  DummyQuoteMetadata,
  DummyQuotesNoApproval,
  DummyQuotesWithApproval,
} from '../../../../e2e/api-mocking/mock-responses/bridge-api-quotes';
import { QuoteResponse } from '../../../components/UI/Bridge/types';
import { QuoteMetadata } from '@metamask/bridge-controller';
import { backgroundState } from '../../test/initial-root-state';
import { TransactionMeta } from '@metamask/transaction-controller';

let mockSubmitTx: jest.Mock<Promise<TransactionMeta>, [QuoteResponse & QuoteMetadata, boolean]>;
let mockAddSwapsTransaction: jest.Mock;

jest.mock('../../../core/Engine', () => {
  mockSubmitTx = jest.fn<Promise<TransactionMeta>, [QuoteResponse & QuoteMetadata, boolean]>();
  return {
    context: {
      BridgeStatusController: {
        startPollingForBridgeTxStatus: jest.fn(),
        submitTx: mockSubmitTx,
      },
    },
  };
});

jest.mock('../../swaps/swaps-transactions', () => {
  mockAddSwapsTransaction = jest.fn();
  return {
    addSwapsTransaction: mockAddSwapsTransaction,
  };
});

jest.mock('../../../selectors/networkController', () => {
  const original = jest.requireActual('../../../selectors/networkController');
  return {
    ...original,
    selectSelectedNetworkClientId: () => 'mainnet',
    selectEvmNetworkConfigurationsByChainId: jest.fn(() => ({
      '0x1': {
        blockExplorerUrls: ['https://etherscan.io'],
        chainId: '0x1',
        defaultBlockExplorerUrlIndex: 0,
        defaultRpcEndpointIndex: 0,
        name: 'Ethereum Mainnet',
        nativeCurrency: 'ETH',
        rpcEndpoints: [
          {
            networkClientId: 'mainnet',
            type: 'infura',
            url: 'https://mainnet.infura.io/v3/infuraProjectId',
          },
        ],
      },
      '0xa4b1': {
        blockExplorerUrls: ['https://explorer.arbitrum.io'],
        chainId: '0xa4b1',
        defaultBlockExplorerUrlIndex: 0,
        defaultRpcEndpointIndex: 0,
        name: 'Arbitrum One',
        nativeCurrency: 'ETH',
        rpcEndpoints: [
          {
            networkClientId: '3725601d-f497-43aa-9afa-97c26e9033a3',
            type: 'custom',
            url: 'https://arbitrum-mainnet.infura.io/v3/infuraProjectId',
          },
        ],
      },
    })),
  };
});

const mockStore = configureMockStore();

describe('useSubmitBridgeTx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createWrapper = (mockState = {}) => {
    const store = mockStore({
      engine: {
        backgroundState: {
          ...backgroundState,
          BridgeController: {
            quoteRequest: {
              slippage: 0.5,
            },
          },
          BridgeStatusController: {
            startPollingForBridgeTxStatus: jest.fn(),
          },
          SmartTransactionsController: {
            smartTransactionsState: {
              liveness: true,
            },
          },
        },
      },
      swaps: {
        featureFlags: {
          smart_transactions: {
            mobile_active: true,
          },
          smartTransactions: {
            mobileActive: true,
          },
        },
      },
      ...mockState,
    });
    return ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
  };

  it('should handle bridge transaction without approval', async () => {
    const { result } = renderHook(() => useSubmitBridgeTx(), {
      wrapper: createWrapper(),
    });

    const mockQuoteResponse = {
      ...DummyQuotesNoApproval.OP_0_005_ETH_TO_ARB[0],
      ...DummyQuoteMetadata,
    };

    mockSubmitTx.mockResolvedValueOnce({
      chainId: '0x1',
      id: '1',
      networkClientId: '1',
      status: 'submitted',
      time: Date.now(),
      txParams: {
        from: '0x1234567890123456789012345678901234567890'
      },
    } as TransactionMeta);

    const txResult = await result.current.submitBridgeTx({
      quoteResponse: mockQuoteResponse as QuoteResponse & QuoteMetadata,
    });

    expect(mockSubmitTx).toHaveBeenCalledWith(
      mockQuoteResponse,
      expect.any(Boolean)
    );
    expect(txResult).toEqual({
      chainId: '0x1',
      id: '1',
      networkClientId: '1',
      status: 'submitted',
      time: expect.any(Number),
      txParams: {
        from: '0x1234567890123456789012345678901234567890',
      },
    });
  });

  it('should handle bridge transaction with approval', async () => {
    const { result } = renderHook(() => useSubmitBridgeTx(), {
      wrapper: createWrapper(),
    });

    const mockQuoteResponse = {
      ...DummyQuotesWithApproval.ETH_11_USDC_TO_ARB[0],
      ...DummyQuoteMetadata,
    };

    mockSubmitTx.mockResolvedValueOnce({
      chainId: '0x1',
      id: '1',
      networkClientId: '1',
      status: 'submitted',
      time: Date.now(),
      txParams: {
        from: '0x1234567890123456789012345678901234567890'
      },
    } as TransactionMeta);

    const txResult = await result.current.submitBridgeTx({
      quoteResponse: mockQuoteResponse as QuoteResponse & QuoteMetadata,
    });

    expect(mockSubmitTx).toHaveBeenCalledWith(
      mockQuoteResponse,
      expect.any(Boolean)
    );
    expect(txResult).toEqual({
      chainId: '0x1',
      id: '1',
      networkClientId: '1',
      status: 'submitted',
      time: expect.any(Number),
      txParams: {
        from: '0x1234567890123456789012345678901234567890',
      },
    });
  });

  it('should propagate errors from approval transaction', async () => {
    const { result } = renderHook(() => useSubmitBridgeTx(), {
      wrapper: createWrapper(),
    });

    const mockQuoteResponse = {
      ...DummyQuotesWithApproval.ETH_11_USDC_TO_ARB[0],
      ...DummyQuoteMetadata,
    };

    const error = new Error('Approval failed');
    mockSubmitTx.mockRejectedValueOnce(error);

    await expect(
      result.current.submitBridgeTx({
        quoteResponse: mockQuoteResponse as QuoteResponse & QuoteMetadata,
      }),
    ).rejects.toThrow('Approval failed');
  });

  it('should propagate errors from bridge transaction', async () => {
    const { result } = renderHook(() => useSubmitBridgeTx(), {
      wrapper: createWrapper(),
    });

    const mockQuoteResponse = {
      ...DummyQuotesWithApproval.ETH_11_USDC_TO_ARB[0],
      ...DummyQuoteMetadata,
    };

    const error = new Error('Bridge transaction failed');
    mockSubmitTx.mockRejectedValueOnce(error);

    await expect(
      result.current.submitBridgeTx({
        quoteResponse: mockQuoteResponse as QuoteResponse & QuoteMetadata,
      }),
    ).rejects.toThrow('Bridge transaction failed');
  });

  it('should handle errors from serializeQuoteMetadata', async () => {
    const { result } = renderHook(() => useSubmitBridgeTx(), {
      wrapper: createWrapper(),
    });

    // Create an invalid quote response that will cause serialization to fail
    const invalidQuoteResponse = {
      ...DummyQuotesWithApproval.ETH_11_USDC_TO_ARB[0],
      ...DummyQuoteMetadata,
      sentAmount: {
        amount: 'NaN', // This will cause serialization to fail
        valueInCurrency: '0',
        usd: '0',
      },
    };

    mockSubmitTx.mockRejectedValueOnce(new Error('Serialization failed'));

    await expect(
      result.current.submitBridgeTx({
        quoteResponse: invalidQuoteResponse as QuoteResponse & QuoteMetadata,
      }),
    ).rejects.toThrow('Serialization failed');
  });

  describe('Transaction History Recording', () => {
    it('should record Solana swap transaction in history', async () => {
      const { result } = renderHook(() => useSubmitBridgeTx(), {
        wrapper: createWrapper(),
      });

      // Create a Solana swap quote (same chain swap)
      const solanaSwapQuote = {
        quote: {
          requestId: '4fc6b81c-33ee-42e2-b816-009f29e2ae5d',
          srcChainId: 1151111081099710, // Solana mainnet
          srcTokenAmount: '500000000',
          srcAsset: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: 1151111081099710,
            symbol: 'SOL',
            decimals: 9,
            name: 'SOL',
          },
          destChainId: 1151111081099710, // Same chain - this is a swap
          destTokenAmount: '57056221',
          destAsset: {
            address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Custom USDC token
            chainId: 1151111081099710,
            symbol: 'USDC',
            decimals: 6,
            name: 'USD Coin',
          },
          bridgeId: 'lifi',
        },
        trade: '0xsolana_tx_data',
        estimatedProcessingTimeInSeconds: 5,
        ...DummyQuoteMetadata,
      };

      const mockTxResult = {
        chainId: 1151111081099710,
        id: 'sol_tx_123',
        hash: 'sol_hash_123',
        networkClientId: 'solana',
        status: 'submitted',
        time: Date.now(),
        txParams: {
          from: 'SolanaAddress123',
        },
      } as TransactionMeta;

      mockSubmitTx.mockResolvedValueOnce(mockTxResult);
      mockAddSwapsTransaction.mockClear();

      await result.current.submitBridgeTx({
        quoteResponse: solanaSwapQuote as QuoteResponse & QuoteMetadata,
      });

      // Verify transaction was recorded in swaps history
      expect(mockAddSwapsTransaction).toHaveBeenCalledWith(
        'sol_hash_123',
        expect.objectContaining({
          action: 'swap', // Same chain = swap
          sourceToken: {
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'SOL',
            decimals: 9,
            chainId: 1151111081099710,
          },
          destinationToken: {
            address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            symbol: 'USDC',
            decimals: 6,
            chainId: 1151111081099710,
          },
          sourceAmount: '500000000',
          destinationAmount: '57056221',
          bridgeId: 'lifi',
        }),
      );
    });

    it('should record bridge transaction in history', async () => {
      const { result } = renderHook(() => useSubmitBridgeTx(), {
        wrapper: createWrapper(),
      });

      const bridgeQuote = {
        ...DummyQuotesNoApproval.OP_0_005_ETH_TO_ARB[0],
        ...DummyQuoteMetadata,
      };

      const mockTxResult = {
        chainId: '0x1',
        id: 'eth_tx_123',
        hash: 'eth_hash_123',
        networkClientId: 'mainnet',
        status: 'submitted',
        time: Date.now(),
        txParams: {
          from: '0x1234567890123456789012345678901234567890',
        },
      } as TransactionMeta;

      mockSubmitTx.mockResolvedValueOnce(mockTxResult);
      mockAddSwapsTransaction.mockClear();

      await result.current.submitBridgeTx({
        quoteResponse: bridgeQuote as QuoteResponse & QuoteMetadata,
      });

      // Verify transaction was recorded with bridge action
      expect(mockAddSwapsTransaction).toHaveBeenCalledWith(
        'eth_hash_123',
        expect.objectContaining({
          action: 'bridge', // Different chains = bridge
        }),
      );
    });

    it('should handle missing transaction hash gracefully', async () => {
      const { result } = renderHook(() => useSubmitBridgeTx(), {
        wrapper: createWrapper(),
      });

      const quote = {
        ...DummyQuotesNoApproval.OP_0_005_ETH_TO_ARB[0],
        ...DummyQuoteMetadata,
      };

      // Transaction result without hash
      const mockTxResult = {
        chainId: '0x1',
        id: 'tx_123',
        networkClientId: 'mainnet',
        status: 'submitted',
        time: Date.now(),
        txParams: {
          from: '0x1234567890123456789012345678901234567890',
        },
      } as TransactionMeta;

      mockSubmitTx.mockResolvedValueOnce(mockTxResult);
      mockAddSwapsTransaction.mockClear();

      await result.current.submitBridgeTx({
        quoteResponse: quote as QuoteResponse & QuoteMetadata,
      });

      // Should use id as fallback
      expect(mockAddSwapsTransaction).toHaveBeenCalledWith(
        'tx_123',
        expect.any(Object),
      );
    });
  });
});
