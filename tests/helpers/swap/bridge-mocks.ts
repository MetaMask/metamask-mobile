import { Mockttp } from 'mockttp';
import { TestSpecificMock } from '../../framework';
import {
  setupMockRequest,
  setupSSEMockRequest,
} from '../../api-mocking/helpers/mockHelpers';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  GET_TOKENS_MAINNET_RESPONSE,
  GET_TOKENS_SOLANA_RESPONSE,
  GET_TOKENS_BASE_RESPONSE,
  GET_QUOTE_ETH_SOLANA_RESPONSE,
  GET_QUOTE_ETH_BASE_RESPONSE,
  GET_TOP_ASSETS_BASE_RESPONSE,
  GET_POPULAR_TOKENS_MAINNET_RESPONSE,
  GET_POPULAR_TOKENS_BASE_RESPONSE,
  toSSEResponse,
} from './constants';
import { setupSpotPricesMock } from './swap-mocks';

const BRIDGE_TX_STATUS_COMPLETE = {
  status: 'COMPLETE',
  srcChain: {
    chainId: 1,
    txHash:
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  },
  destChain: {
    chainId: 8453,
    txHash:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  },
};

// Quote id used by the bridgeQuoteStatusManager e2e coverage below. The
// BridgeStatusController only calls getQuoteStatus for history items that
// have a `quoteId`, so the mocked quote response must include one.
const QUOTE_STATUS_MANAGER_QUOTE_ID = 'quote-status-manager-test-quote-1';

/** Adds a `quoteId` to each quote in a mocked quote response array so the
 * BridgeStatusController's `bridgeQuoteStatusManager` code path (getQuoteStatus
 * instead of getTxStatus) is exercised for that quote. */
function withQuoteId<T extends Record<string, unknown>>(
  quotes: T[],
): (T & { quoteId: string })[] {
  return quotes.map((quote) => ({
    ...quote,
    quoteId: QUOTE_STATUS_MANAGER_QUOTE_ID,
  }));
}

/** Minimal COMPLETE response for `GET /getQuoteStatus` (QuoteStatusGetResponse). */
const BRIDGE_QUOTE_STATUS_COMPLETE = {
  submittedTx: {
    status: 'COMPLETE',
    isExpectedToken: true,
    bridge: 'across',
    srcChain: {
      chainId: 1,
      txHash: BRIDGE_TX_STATUS_COMPLETE.srcChain.txHash,
    },
    destChain: {
      chainId: 8453,
      txHash: BRIDGE_TX_STATUS_COMPLETE.destChain.txHash,
    },
  },
};

export const testSpecificMock: TestSpecificMock = async (
  mockServer: Mockttp,
) => {
  await setupSpotPricesMock(mockServer);

  await setupRemoteFeatureFlagsMock(mockServer, {
    bridgeConfigV2: {
      chainRanking: [
        { chainId: 'eip155:1', name: 'Ethereum' },
        { chainId: 'eip155:8453', name: 'Base' },
        { chainId: 'eip155:10', name: 'OP Mainnet' },
        { chainId: 'eip155:137', name: 'Polygon' },
        { chainId: 'eip155:42161', name: 'Arbitrum One' },
        { chainId: 'eip155:43114', name: 'Avalanche' },
        { chainId: 'eip155:59144', name: 'Linea' },
        { chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', name: 'Solana' },
      ],
    },
    stxMigrationBatchStatus: false,
    stxMigrationCancel: false,
    stxMigrationGetFees: false,
    stxMigrationSubmitTransactions: false,
    swapsSWAPS4543AbtestPostTradeModal: 'control',
  });
  // Mock Ethereum token list
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getTokens.*chainId=1/i,
    response: GET_TOKENS_MAINNET_RESPONSE,
    responseCode: 200,
  });

  // Mock Solana token list
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getTokens.*chainId=1151111081099710/i,
    response: GET_TOKENS_SOLANA_RESPONSE,
    responseCode: 200,
  });

  // Mock Base token list
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getTokens.*chainId=8453/i,
    response: GET_TOKENS_BASE_RESPONSE,
    responseCode: 200,
  });

  // Mock Base top assets list
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /networks\/8453\/topAssets\/?/i,
    response: GET_TOP_ASSETS_BASE_RESPONSE,
    responseCode: 200,
  });

  // ── SSE path (bridge-controller uses getQuoteStream for SSE streaming) ──
  // Catch-all for getQuoteStream — low priority fallback to prevent real network calls
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream/i,
    toSSEResponse(GET_QUOTE_ETH_BASE_RESPONSE),
    1, // lower priority than specific mocks below (999)
  );

  // Mock SSE quote response ETH(Ethereum)->SOL(Solana)
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream.*destChainId=1151111081099710/i,
    toSSEResponse(GET_QUOTE_ETH_SOLANA_RESPONSE),
  );

  // Mock SSE quote response ETH(Ethereum)->ETH(BASE)
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream.*destChainId=8453/i,
    toSSEResponse(GET_QUOTE_ETH_BASE_RESPONSE),
  );

  // Mock popular tokens (POST - for token selector)
  // This combines responses from all networks as the API returns tokens for all requested chainIds
  await setupMockRequest(mockServer, {
    requestMethod: 'POST',
    url: /getTokens\/popular/i,
    response: [
      ...GET_POPULAR_TOKENS_MAINNET_RESPONSE,
      ...GET_POPULAR_TOKENS_BASE_RESPONSE,
    ],
    responseCode: 200,
  });

  // Token search (POST) — typing in the selector (≥3 chars) hits /getTokens/search
  await setupMockRequest(mockServer, {
    requestMethod: 'POST',
    url: /getTokens\/search/i,
    response: {
      data: [
        ...GET_POPULAR_TOKENS_MAINNET_RESPONSE,
        ...GET_POPULAR_TOKENS_BASE_RESPONSE,
      ],
      count:
        GET_POPULAR_TOKENS_MAINNET_RESPONSE.length +
        GET_POPULAR_TOKENS_BASE_RESPONSE.length,
      totalCount:
        GET_POPULAR_TOKENS_MAINNET_RESPONSE.length +
        GET_POPULAR_TOKENS_BASE_RESPONSE.length,
      pageInfo: { hasNextPage: false },
    },
    responseCode: 200,
  });

  // Mock getTxStatus with a full response so the BridgeStatusController
  // marks the bridge as complete (srcChain + destChain txHash present)
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getTxStatus/i,
    response: BRIDGE_TX_STATUS_COMPLETE,
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /tx-sentinel-[a-z0-9-]+\.api\.cx\.metamask\.io\/v1\/networks\/\d+\/batchStatus/,
    response: {},
    responseCode: 200,
  });
};

/**
 * Mocks the bridge-api `GET /getQuoteStatus` endpoint, used by the
 * `bridgeQuoteStatusManager` code path in `BridgeStatusController` in place of
 * `getTxStatus` when a history item has a `quoteId`.
 *
 * @param mockServer - The mockttp server instance.
 * @param response - The response body to return. Pass a response without
 * `submittedTx` (e.g. `{}`) to exercise the `getTxStatus` fallback instead.
 */
export async function mockGetQuoteStatus(
  mockServer: Mockttp,
  response: unknown = BRIDGE_QUOTE_STATUS_COMPLETE,
): Promise<void> {
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuoteStatus/i,
    response,
    responseCode: 200,
  });
}

/**
 * Mocks the bridge-api `POST /quote/updateStatus` endpoint. The quote status
 * manager calls this whenever a tracked quote's source transaction is
 * submitted or finalized, independently of the `getQuoteStatus` polling flow.
 *
 * @param mockServer - The mockttp server instance.
 */
export async function mockUpdateQuoteStatus(
  mockServer: Mockttp,
): Promise<void> {
  await setupMockRequest(mockServer, {
    requestMethod: 'POST',
    url: /quote\/updateStatus/i,
    response: {},
    responseCode: 200,
  });
}

/**
 * Creates a {@link TestSpecificMock} for e2e coverage of the
 * `bridgeQuoteStatusManager` code path, where `BridgeStatusController`
 * fetches status via `getQuoteStatus` instead of `getTxStatus` for history
 * items that have a `quoteId`. Enables the `bridgeQuoteStatusManager` remote
 * feature flag and mocks the ETH(Ethereum)->ETH(Base) quote with a `quoteId`,
 * so the primary (non-fallback) status-fetching path is exercised.
 *
 * `getTxStatus` is still mocked with a COMPLETE response so the fallback path
 * (when `getQuoteStatus` has no `submittedTx` yet) can also complete the
 * bridge.
 *
 * @param getQuoteStatusResponse - The response for the mocked
 * `getQuoteStatus` endpoint. Defaults to a COMPLETE response.
 */
export const createBridgeQuoteStatusManagerMock = (
  getQuoteStatusResponse: unknown = BRIDGE_QUOTE_STATUS_COMPLETE,
): TestSpecificMock =>
  async function bridgeQuoteStatusManagerMock(mockServer: Mockttp) {
    await setupSpotPricesMock(mockServer);

    await setupRemoteFeatureFlagsMock(mockServer, {
      bridgeConfigV2: {
        chainRanking: [
          { chainId: 'eip155:1', name: 'Ethereum' },
          { chainId: 'eip155:8453', name: 'Base' },
          { chainId: 'eip155:10', name: 'OP Mainnet' },
          { chainId: 'eip155:137', name: 'Polygon' },
          { chainId: 'eip155:42161', name: 'Arbitrum One' },
          { chainId: 'eip155:43114', name: 'Avalanche' },
          { chainId: 'eip155:59144', name: 'Linea' },
          {
            chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            name: 'Solana',
          },
        ],
      },
      bridgeQuoteStatusManager: { enabled: true },
      stxMigrationBatchStatus: false,
      stxMigrationCancel: false,
      stxMigrationGetFees: false,
      stxMigrationSubmitTransactions: false,
      swapsSWAPS4543AbtestPostTradeModal: 'control',
    });

    // Mock Ethereum token list
    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: /getTokens.*chainId=1/i,
      response: GET_TOKENS_MAINNET_RESPONSE,
      responseCode: 200,
    });

    // Mock Base token list
    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: /getTokens.*chainId=8453/i,
      response: GET_TOKENS_BASE_RESPONSE,
      responseCode: 200,
    });

    // Mock Base top assets list
    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: /networks\/8453\/topAssets\/?/i,
      response: GET_TOP_ASSETS_BASE_RESPONSE,
      responseCode: 200,
    });

    const quotesWithId = withQuoteId(GET_QUOTE_ETH_BASE_RESPONSE);

    // ── SSE path (bridge-controller uses getQuoteStream for SSE streaming) ──
    // Catch-all for getQuoteStream — low priority fallback to prevent real network calls
    await setupSSEMockRequest(
      mockServer,
      /getQuoteStream/i,
      toSSEResponse(quotesWithId),
      1, // lower priority than the specific mock below (999)
    );

    // Mock SSE quote response ETH(Ethereum)->ETH(Base), with a quoteId so
    // BridgeStatusController prefers getQuoteStatus over getTxStatus.
    await setupSSEMockRequest(
      mockServer,
      /getQuoteStream.*destChainId=8453/i,
      toSSEResponse(quotesWithId),
    );

    // Mock popular tokens (POST - for token selector)
    await setupMockRequest(mockServer, {
      requestMethod: 'POST',
      url: /getTokens\/popular/i,
      response: [
        ...GET_POPULAR_TOKENS_MAINNET_RESPONSE,
        ...GET_POPULAR_TOKENS_BASE_RESPONSE,
      ],
      responseCode: 200,
    });

    // Token search (POST) — typing in the selector (≥3 chars) hits /getTokens/search
    await setupMockRequest(mockServer, {
      requestMethod: 'POST',
      url: /getTokens\/search/i,
      response: {
        data: [
          ...GET_POPULAR_TOKENS_MAINNET_RESPONSE,
          ...GET_POPULAR_TOKENS_BASE_RESPONSE,
        ],
        count:
          GET_POPULAR_TOKENS_MAINNET_RESPONSE.length +
          GET_POPULAR_TOKENS_BASE_RESPONSE.length,
        totalCount:
          GET_POPULAR_TOKENS_MAINNET_RESPONSE.length +
          GET_POPULAR_TOKENS_BASE_RESPONSE.length,
        pageInfo: { hasNextPage: false },
      },
      responseCode: 200,
    });

    await mockGetQuoteStatus(mockServer, getQuoteStatusResponse);
    await mockUpdateQuoteStatus(mockServer);

    // Mock getTxStatus with a full response so the fallback path (when
    // getQuoteStatus has no submittedTx yet) can also complete the bridge.
    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: /getTxStatus/i,
      response: BRIDGE_TX_STATUS_COMPLETE,
      responseCode: 200,
    });

    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: /tx-sentinel-[a-z0-9-]+\.api\.cx\.metamask\.io\/v1\/networks\/\d+\/batchStatus/,
      response: {},
      responseCode: 200,
    });
  };
