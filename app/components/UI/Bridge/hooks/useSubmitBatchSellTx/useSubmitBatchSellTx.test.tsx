import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import type { QuoteMetadata, QuoteResponse } from '@metamask/bridge-controller';
import type { TransactionMeta } from '@metamask/transaction-controller';

import {
  DummyQuoteMetadata,
  DummyQuotesNoApproval,
  DummyQuotesWithApproval,
} from '../../../../../../tests/api-mocking/mock-responses/bridge-api-quotes';
import { selectBatchSellSourceWalletAddress } from '../../../../../selectors/bridge';
import { useSubmitBatchSellTx } from '.';

type BridgeQuoteResponse = QuoteResponse & QuoteMetadata;

let mockSubmitBatchSell: jest.Mock<
  Promise<TransactionMeta>,
  [
    {
      quoteResponses: (BridgeQuoteResponse | null)[];
      accountAddress: string;
    },
  ]
>;

jest.mock('../../../../../core/Engine', () => {
  mockSubmitBatchSell = jest.fn<
    Promise<TransactionMeta>,
    [
      {
        quoteResponses: (BridgeQuoteResponse | null)[];
        accountAddress: string;
      },
    ]
  >();

  return {
    controllerMessenger: {},
    context: {
      BridgeStatusController: {
        submitBatchSell: mockSubmitBatchSell,
      },
    },
  };
});

jest.mock('../../../../../selectors/smartTransactionsController', () => ({
  ...jest.requireActual('../../../../../selectors/smartTransactionsController'),
  selectShouldUseSmartTransaction: jest.fn(() => true),
}));

const { selectShouldUseSmartTransaction: mockSelectShouldUseSmartTransaction } =
  jest.requireMock('../../../../../selectors/smartTransactionsController');

const mockSourceTokens = [
  {
    address: '0x1111111111111111111111111111111111111111',
    chainId: '0x1',
    decimals: 18,
    symbol: 'ETH',
  },
];

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/bridge'),
  selectBatchSellSourceTokens: jest.fn(() => mockSourceTokens),
}));

jest.mock('../../../../../selectors/bridge', () => ({
  ...jest.requireActual('../../../../../selectors/bridge'),
  selectBatchSellSourceWalletAddress: jest.fn(
    () => '0x1234567890123456789012345678901234567890',
  ),
}));

const mockStore = configureMockStore();

describe('useSubmitBatchSellTx', () => {
  const createWrapper = (mockState = {}) => {
    const store = mockStore({
      bridge: {
        batchSellDestToken: undefined,
      },
      ...mockState,
    });

    return ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(selectBatchSellSourceWalletAddress)
      .mockReturnValue('0x1234567890123456789012345678901234567890');
  });

  it('submits Batch Sell with the recommended quote responses', async () => {
    const { result } = renderHook(() => useSubmitBatchSellTx(), {
      wrapper: createWrapper({
        bridge: {
          batchSellDestToken: {
            symbol: 'SCAM',
            securityData: {
              type: 'Malicious',
            },
          },
        },
      }),
    });

    const firstQuoteResponse = {
      ...DummyQuotesWithApproval.ETH_11_USDC_TO_ARB[0],
      ...DummyQuoteMetadata,
    } as BridgeQuoteResponse;
    const secondQuoteResponse = {
      ...DummyQuotesNoApproval.OP_0_005_ETH_TO_ARB[0],
      ...DummyQuoteMetadata,
    } as BridgeQuoteResponse;
    const mockBatchSellResult = {
      chainId: '0x1',
      id: 'batch-sell-1',
      networkClientId: '1',
      status: 'submitted',
      time: Date.now(),
      txParams: {
        from: '0x1234567890123456789012345678901234567890',
      },
    } as TransactionMeta;

    mockSubmitBatchSell.mockResolvedValueOnce(mockBatchSellResult);

    const txResult = await result.current.submitBatchSellTx({
      quoteResponses: [firstQuoteResponse, secondQuoteResponse],
    });

    expect(mockSubmitBatchSell).toHaveBeenCalledWith({
      quoteResponses: [
        {
          ...firstQuoteResponse,
          approval: firstQuoteResponse.approval ?? undefined,
        },
        {
          ...secondQuoteResponse,
          approval: secondQuoteResponse.approval ?? undefined,
        },
      ],
      accountAddress: '0x1234567890123456789012345678901234567890',
      location: undefined,
      isStxEnabled: true,
      quotesReceivedContext: undefined,
      tokenSecurityTypeDestination: 'Malicious',
    });
    expect(txResult).toEqual(mockBatchSellResult);
  });

  it('throws when Batch Sell wallet address is not set', async () => {
    jest.mocked(selectBatchSellSourceWalletAddress).mockReturnValue(undefined);

    const { result } = renderHook(() => useSubmitBatchSellTx(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.submitBatchSellTx({
        quoteResponses: [],
      }),
    ).rejects.toThrow('Batch Sell wallet address is not set');
  });

  it('passes the normalized source chain ID to selectShouldUseSmartTransaction', () => {
    renderHook(() => useSubmitBatchSellTx(), {
      wrapper: createWrapper(),
    });

    expect(mockSelectShouldUseSmartTransaction).toHaveBeenCalledWith(
      expect.anything(),
      '0x1',
    );
  });
});
