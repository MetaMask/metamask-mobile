/**
 * Deterministic HTTP + Engine data for the deeplink swap source-token case
 * (`swap?from=<CAIP-19 asset>&amount=<atomic units>`).
 *
 * Importable from unit and component-view suites: it takes the (already
 * mocked) Engine as an argument instead of importing it, and installs no
 * `jest.mock`.
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';

const TOKEN_API_ORIGIN = 'https://tokens.api.cx.metamask.io';

export const DEEPLINK_SWAP_SOURCE_ASSET =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

/** Intercepts the token-metadata lookup the swap handler performs. */
export function setupDeeplinkSwapTokenApiMock(): void {
  clearAllNockMocks();
  disableNetConnect();
  nock(TOKEN_API_ORIGIN)
    .get('/v3/assets')
    .query(true)
    .reply(200, [
      {
        assetId: DEEPLINK_SWAP_SOURCE_ASSET,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        iconUrl: 'https://static.cx.metamask.io/usdc.png',
      },
    ])
    .persist();
}

export function clearDeeplinkSwapTokenApiMock(): void {
  teardownNock();
}

interface EngineWithContext {
  context: Record<string, Record<string, unknown> | undefined>;
}

/**
 * Makes Ethereum mainnet available to the swap handler's chain checks and
 * returns a function that restores the previous controller methods.
 */
export function stubDeeplinkSwapEngineChains(engine: EngineWithContext) {
  const networkController = (engine.context.NetworkController ??= {});
  const enablementController = (engine.context.NetworkEnablementController ??=
    {});
  const previousGetConfig = networkController.getNetworkConfigurationByChainId;
  const previousEnable = enablementController.enableNetwork;

  networkController.getNetworkConfigurationByChainId = jest.fn(
    (chainId: string) =>
      chainId === '0x1'
        ? { chainId: '0x1', name: 'Ethereum Mainnet' }
        : undefined,
  );
  enablementController.enableNetwork = jest.fn().mockResolvedValue(undefined);

  return () => {
    networkController.getNetworkConfigurationByChainId = previousGetConfig;
    enablementController.enableNetwork = previousEnable;
  };
}

/**
 * Installs the external data a fixture case declares via `boundary` and returns
 * its teardown. Cases without a boundary get a no-op.
 */
export function installDeeplinkCaseBoundary(
  boundary: 'swap-source-token' | undefined,
  engine: EngineWithContext,
): () => void {
  if (boundary !== 'swap-source-token') {
    return () => undefined;
  }
  setupDeeplinkSwapTokenApiMock();
  const restoreEngine = stubDeeplinkSwapEngineChains(engine);
  return () => {
    restoreEngine();
    clearDeeplinkSwapTokenApiMock();
  };
}
