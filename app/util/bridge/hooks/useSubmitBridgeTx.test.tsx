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
import { QuoteMetadata, QuoteResponse } from '@metamask/bridge-controller';
import { backgroundState } from '../../test/initial-root-state';
import { TransactionMeta } from '@metamask/transaction-controller';
import { selectSourceWalletAddress } from '../../../selectors/bridge';
import { BridgeQuoteResponse } from '../../../components/UI/Bridge/types';

let mockSubmitTx: jest.Mock<
  Promise<TransactionMeta>,
  [string, QuoteResponse & QuoteMetadata, boolean]
>;

jest.mock('../../../core/Engine', () => {
  mockSubmitTx = jest.fn<
    Promise<TransactionMeta>,
    [string, QuoteResponse & QuoteMetadata, boolean]
  >();
  return {
    context: {
      BridgeStatusController: {
        startPollingForBridgeTxStatus: jest.fn(),
        submitTx: mockSubmitTx,
      },
    },
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

jest.mock('../../../selectors/smartTransactionsController', () => ({
  ...jest.requireActual('../../../selectors/smartTransactionsController'),
  selectShouldUseSmartTransaction: jest.fn(() => true),
}));

jest.mock('../../../selectors/bridge', () => ({
  ...jest.requireActual('../../../selectors/bridge'),
  selectSourceWalletAddress: jest.fn(
    () => '0x1234567890123456789012345678901234567890',
  ),
}));

const mockHandleIntentTransaction = jest.fn();
jest.mock('../../../lib/transaction/intent', () => ({
  handleIntentTransaction: (...args: unknown[]) =>
    mockHandleIntentTransaction(...args),
}));

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
      aggregator: 'test-aggregator',
      walletAddress: '0x1234567890123456789012345678901234567890',
    };

    mockSubmitTx.mockResolvedValueOnce({
      chainId: '0x1',
      id: '1',
      networkClientId: '1',
      status: 'submitted',
      time: Date.now(),
      txParams: {
        from: '0x1234567890123456789012345678901234567890',
      },
    } as TransactionMeta);

    const txResult = await result.current.submitBridgeTx({
      quoteResponse: mockQuoteResponse as BridgeQuoteResponse,
    });

    expect(mockSubmitTx).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
      {
        ...mockQuoteResponse,
        approval: undefined,
      },
      true,
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
      aggregator: 'test-aggregator',
      walletAddress: '0x1234567890123456789012345678901234567890',
    };

    mockSubmitTx.mockResolvedValueOnce({
      chainId: '0x1',
      id: '1',
      networkClientId: '1',
      status: 'submitted',
      time: Date.now(),
      txParams: {
        from: '0x1234567890123456789012345678901234567890',
      },
    } as TransactionMeta);

    const txResult = await result.current.submitBridgeTx({
      quoteResponse: mockQuoteResponse as BridgeQuoteResponse,
    });

    expect(mockSubmitTx).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
      {
        ...mockQuoteResponse,
        approval: mockQuoteResponse.approval ?? undefined,
      },
      true,
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
      aggregator: 'test-aggregator',
      walletAddress: '0x1234567890123456789012345678901234567890',
    };

    const error = new Error('Approval failed');
    mockSubmitTx.mockRejectedValueOnce(error);

    await expect(
      result.current.submitBridgeTx({
        quoteResponse: mockQuoteResponse as BridgeQuoteResponse,
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
      aggregator: 'test-aggregator',
      walletAddress: '0x1234567890123456789012345678901234567890',
    };

    const error = new Error('Bridge transaction failed');
    mockSubmitTx.mockRejectedValueOnce(error);

    await expect(
      result.current.submitBridgeTx({
        quoteResponse: mockQuoteResponse as BridgeQuoteResponse,
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
      aggregator: 'test-aggregator',
      walletAddress: '0x1234567890123456789012345678901234567890',
      sentAmount: {
        amount: 'NaN', // This will cause serialization to fail
        valueInCurrency: '0',
        usd: '0',
      },
    };

    mockSubmitTx.mockRejectedValueOnce(new Error('Serialization failed'));

    await expect(
      result.current.submitBridgeTx({
        quoteResponse: invalidQuoteResponse as BridgeQuoteResponse,
      }),
    ).rejects.toThrow('Serialization failed');
  });

  it('should throw error when wallet address is not set', async () => {
    // Make the mocked selector return undefined for this test
    jest.mocked(selectSourceWalletAddress).mockReturnValueOnce(undefined);

    const { result } = renderHook(() => useSubmitBridgeTx(), {
      wrapper: createWrapper(),
    });

    const mockQuoteResponse = {
      ...DummyQuotesNoApproval.OP_0_005_ETH_TO_ARB[0],
      ...DummyQuoteMetadata,
      aggregator: 'test-aggregator',
      walletAddress: '0x1234567890123456789012345678901234567890',
    };

    await expect(
      result.current.submitBridgeTx({
        quoteResponse: mockQuoteResponse as BridgeQuoteResponse,
      }),
    ).rejects.toThrow('Wallet address is not set');
  });

  it('calls handleIntentTransaction for quoteResponse with intent', async () => {
    const { result } = renderHook(() => useSubmitBridgeTx(), {
      wrapper: createWrapper(),
    });

    const mockIntentResult = {
      chainId: '0x1',
      id: 'intent-1',
      networkClientId: '1',
      status: 'submitted',
      time: Date.now(),
      txParams: {
        from: '0x1234567890123456789012345678901234567890',
      },
    } as TransactionMeta;

    mockHandleIntentTransaction.mockResolvedValueOnce(mockIntentResult);

    const baseQuote = DummyQuotesNoApproval.OP_0_005_ETH_TO_ARB[0];
    const mockQuoteResponse = {
      ...baseQuote,
      ...DummyQuoteMetadata,
      aggregator: 'test-aggregator',
      walletAddress: '0x1234567890123456789012345678901234567890',
      quote: {
        ...baseQuote.quote,
        intent: {
          protocol: 'cowswap',
          order: {
            sellToken: '0x0000000000000000000000000000000000000000',
            buyToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            sellAmount: '1000000000000000000',
            buyAmount: '2000000000',
            validTo: '1234567890',
            appData: '0x',
            appDataHash:
              '0x0000000000000000000000000000000000000000000000000000000000000000',
            receiver: '0x1234567890123456789012345678901234567890',
            feeAmount: '0',
            kind: 'sell',
            partiallyFillable: false,
            sellTokenBalance: 'erc20',
            buyTokenBalance: 'erc20',
          },
          settlementContract: '0x9008D19f58AAbd9eD0D60971565AA8510560ab41',
        },
      },
    } as unknown as BridgeQuoteResponse;

    const txResult = await result.current.submitBridgeTx({
      quoteResponse: mockQuoteResponse,
    });

    expect(mockHandleIntentTransaction).toHaveBeenCalledWith(
      mockQuoteResponse,
      '0x1234567890123456789012345678901234567890',
    );
    expect(mockSubmitTx).not.toHaveBeenCalled();
    expect(txResult).toEqual(mockIntentResult);
  });
});
