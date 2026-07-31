import { QuoteStreamCompleteReason } from '@metamask/bridge-controller';
import { Mockttp } from 'mockttp';
import { TestSpecificMock } from '../../framework';
import {
  setupMockRequest,
  setupSSEMockRequest,
} from '../../api-mocking/helpers/mockHelpers';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { getProductionRemoteFlagDefaults } from '../../feature-flags';
import { toSSEResponse } from './constants';
import { testSpecificMock } from './swap-mocks';

const USDC_SRC_TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const GOOGLON_DEST_TOKEN_ADDRESS = '0xba47214edd2bb43099611b208f75e4b42fdcfedc';

const BRIDGE_CONFIG_V2_WITH_SSE = {
  ...(getProductionRemoteFlagDefaults().bridgeConfigV2 as Record<
    string,
    unknown
  >),
  minimumVersion: '0.0.0',
  support: true,
  refreshRate: 30000,
  maxRefreshCount: 5,
  sse: {
    enabled: true,
    minimumVersion: '0.0.0',
  },
};

export const RWA_GEO_BLOCK_REMOTE_FEATURE_FLAG_OVERRIDES = {
  bridgeConfigV2: BRIDGE_CONFIG_V2_WITH_SSE,
  rwaTokensEnabled: true,
  stxMigrationBatchStatus: false,
  stxMigrationCancel: false,
  stxMigrationGetFees: false,
  stxMigrationSubmitTransactions: false,
};

const USDC_TO_GOOGLON_QUOTE_STREAM_PATTERN = new RegExp(
  `getQuoteStream.*srcTokenAddress=${USDC_SRC_TOKEN_ADDRESS}.*destTokenAddress=${GOOGLON_DEST_TOKEN_ADDRESS}`,
  'i',
);

const USDC_TO_GOOGLON_GET_QUOTE_PATTERN = new RegExp(
  `\\/getQuote\\?.*srcTokenAddress=${USDC_SRC_TOKEN_ADDRESS}.*destTokenAddress=${GOOGLON_DEST_TOKEN_ADDRESS}`,
  'i',
);

const RWA_GEO_BLOCKED_SSE_RESPONSE = toSSEResponse([], {
  quoteCount: 0,
  hasQuotes: false,
  reason: QuoteStreamCompleteReason.RWA_GEO_RESTRICTED,
});

/**
 * Mocks USDC → GOOGLON quote stream completing with RWA geo-restriction (no quotes).
 */
async function mockSwapUSDCtoGOOGLONGeoBlocked(
  mockServer: Mockttp,
): Promise<void> {
  await setupSSEMockRequest(
    mockServer,
    USDC_TO_GOOGLON_QUOTE_STREAM_PATTERN,
    RWA_GEO_BLOCKED_SSE_RESPONSE,
    1002,
  );

  await setupMockRequest(
    mockServer,
    {
      requestMethod: 'GET',
      url: USDC_TO_GOOGLON_GET_QUOTE_PATTERN,
      response: [],
      responseCode: 200,
    },
    1002,
  );
}

/**
 * Standard swap mocks with USDC → GOOGLON overridden to return RWA_GEO_RESTRICTED.
 */
export const rwaSwapGeoBlockTestSpecificMock: TestSpecificMock = async (
  mockServer,
) => {
  await testSpecificMock(mockServer);
  await setupRemoteFeatureFlagsMock(
    mockServer,
    RWA_GEO_BLOCK_REMOTE_FEATURE_FLAG_OVERRIDES,
    1002,
  );
  await mockSwapUSDCtoGOOGLONGeoBlocked(mockServer);
};
