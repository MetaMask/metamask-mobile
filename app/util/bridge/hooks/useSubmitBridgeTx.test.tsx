import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import useSubmitBridgeTx from './useSubmitBridgeTx';
import useHandleBridgeTx from './useHandleBridgeTx';
import useHandleApprovalTx from './useHandleApprovalTx';
import {
  DummyQuoteMetadata,
  DummyQuotesNoApproval,
  DummyQuotesWithApproval,
} from '../../../../e2e/api-mocking/mock-responses/bridge-api-quotes';
import { QuoteResponse } from '../../../components/UI/Bridge/types';
import Engine from '../../../core/Engine';
import { QuoteMetadata } from '@metamask/bridge-controller';
import { BigNumber } from 'bignumber.js';

jest.mock('./useHandleBridgeTx');
jest.mock('./useHandleApprovalTx');

jest.mock('../../../core/Engine', () => ({
  context: {
    TokensController: {
      addToken: jest.fn(),
    },
    BridgeStatusController: {
      startPollingForBridgeTxStatus: jest.fn(),
    },
  },
}));

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

  const mockHandleBridgeTx = jest.fn();
  const mockHandleApprovalTx = jest.fn();

  beforeAll(() => {
    (useHandleBridgeTx as jest.Mock).mockReturnValue({
      handleBridgeTx: mockHandleBridgeTx,
    });
    (useHandleApprovalTx as jest.Mock).mockReturnValue({
      handleApprovalTx: mockHandleApprovalTx,
    });
  });

  const createWrapper = (mockState = {}) => {
    const store = mockStore({
      engine: {
        backgroundState: {
          BridgeController: {
            quoteRequest: {
              slippage: 0.5,
            },
          },
          BridgeStatusController: {
            startPollingForBridgeTxStatus: jest.fn(),
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

    mockHandleBridgeTx.mockResolvedValueOnce({ success: true });

    const txResult = await result.current.submitBridgeTx({
      quoteResponse: mockQuoteResponse as QuoteResponse & QuoteMetadata,
    });

    expect(mockHandleApprovalTx).not.toHaveBeenCalled();
    expect(mockHandleBridgeTx).toHaveBeenCalledWith({
      quoteResponse: mockQuoteResponse,
      approvalTxId: undefined,
    });
    expect(txResult).toEqual({ success: true });
  });

  it('should handle bridge transaction with approval', async () => {
    const { result } = renderHook(() => useSubmitBridgeTx(), {
      wrapper: createWrapper(),
    });

    const mockQuoteResponse = {
      ...DummyQuotesWithApproval.ETH_11_USDC_TO_ARB[0],
      ...DummyQuoteMetadata,
    };

    mockHandleApprovalTx.mockResolvedValueOnce({ id: '123' });
    mockHandleBridgeTx.mockResolvedValueOnce({ success: true });

    const txResult = await result.current.submitBridgeTx({
      quoteResponse: mockQuoteResponse as QuoteResponse & QuoteMetadata,
    });

    expect(mockHandleApprovalTx).toHaveBeenCalledWith({
      approval: mockQuoteResponse.approval,
      quoteResponse: mockQuoteResponse,
    });
    expect(mockHandleBridgeTx).toHaveBeenCalledWith({
      quoteResponse: mockQuoteResponse,
      approvalTxId: '123',
    });
    expect(Engine.context.TokensController.addToken).toHaveBeenCalledWith(
      expect.objectContaining({
        address: mockQuoteResponse.quote.srcAsset.address,
        symbol: mockQuoteResponse.quote.srcAsset.symbol,
        decimals: mockQuoteResponse.quote.srcAsset.decimals,
      }),
    );
    expect(txResult).toEqual({ success: true });
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
    mockHandleApprovalTx.mockRejectedValueOnce(error);

    await expect(
      result.current.submitBridgeTx({
        quoteResponse: mockQuoteResponse as QuoteResponse & QuoteMetadata,
      }),
    ).rejects.toThrow('Approval failed');

    expect(mockHandleBridgeTx).not.toHaveBeenCalled();
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
    mockHandleBridgeTx.mockRejectedValueOnce(error);

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
        amount: BigNumber(NaN), // This will cause serialization to fail
        valueInCurrency: BigNumber('0'),
        usd: BigNumber('0'),
      },
    };

    await expect(
      result.current.submitBridgeTx({
        quoteResponse: invalidQuoteResponse as QuoteResponse & QuoteMetadata,
      }),
    ).rejects.toThrow();
  });
});
