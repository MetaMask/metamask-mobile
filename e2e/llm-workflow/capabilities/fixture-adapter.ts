import type { WalletState } from '@metamask/client-mcp-core';
import type {
  Fixture,
  FixtureState,
} from '../../../tests/framework/fixtures/types';
import {
  DEFAULT_ANVIL_PORT,
  FALLBACK_MOCKSERVER_PORT,
} from '../../../tests/framework/Constants';

/** Keys that FixtureState requires as non-null objects. */
const REQUIRED_FIXTURE_STATE_KEYS: readonly (keyof FixtureState)[] = [
  'engine',
  'browser',
  'user',
  'fiatOrders',
  'legalNotices',
] as const;

/**
 * Convert the repo-internal Fixture shape to the WalletState shape used by
 * @metamask/client-mcp-core.
 *
 * - `Fixture.state` is assignable to `Record<string, unknown>` (FixtureState has
 * an index signature `[key: string]: unknown`), so the data side is safe.
 * - `Fixture.asyncState` is `Record<string, string>`. We extract a `version`
 * field if present and parse it to a number. If `version` is missing or not a
 * finite number, we omit `meta` from the resulting WalletState. Any other
 * asyncState keys are intentionally dropped because WalletState.meta only
 * carries a version.
 */
export function fixtureToWalletState(fixture: Fixture): WalletState {
  const rawVersion = fixture.asyncState.version;
  const parsed = Number(rawVersion);
  const meta = Number.isFinite(parsed) ? { version: parsed } : undefined;

  return {
    data: fixture.state,
    ...(meta ? { meta } : {}),
  };
}

/**
 * Convert the WalletState shape from @metamask/client-mcp-core back into the
 * repo-internal Fixture shape expected by FixtureServer.
 *
 * - `WalletState.data` is `Record<string, unknown>`. FixtureState requires
 * several controller-shaped keys (engine/browser/user/etc.). This function
 * validates that the required top-level keys exist; if they do not, it
 * throws an `Error` with a clear message so the failure is visible early.
 * - `WalletState.meta?.version` is a number; FixtureServer's asyncState is a
 * `Record<string, string>` so we serialize the version with `String(...)`.
 * - If `meta` is omitted, asyncState is an empty object (matches today's
 * behavior).
 */
export interface PortOverrides {
  anvilPort?: number;
  mockServerPort?: number;
}

/**
 * Rewrite fallback port references (8545, 8000) in WalletState fixture data
 * to match actually allocated ports.  Equivalent of
 * {@link FixtureHelper.updateRpcUrlsWithAllocatedPorts} for the daemon path.
 */
export function rewritePortsInWalletState(
  state: WalletState,
  overrides: PortOverrides,
): WalletState {
  const data: Record<string, unknown> = JSON.parse(JSON.stringify(state.data));

  rewriteRpcUrls(data, overrides.anvilPort);
  rewriteMockServerUrls(data, overrides.mockServerPort);

  return { ...state, data };
}

function rewriteRpcUrls(
  data: Record<string, unknown>,
  actualAnvilPort: number | undefined,
): void {
  if (actualAnvilPort === undefined || actualAnvilPort === DEFAULT_ANVIL_PORT) {
    return;
  }

  const networkConfigs = getNestedValue(
    data,
    'engine',
    'backgroundState',
    'NetworkController',
    'networkConfigurationsByChainId',
  );

  if (!isRecord(networkConfigs)) return;

  for (const chainId of Object.keys(networkConfigs)) {
    const config = networkConfigs[chainId];
    if (!isRecord(config)) continue;

    const endpoints = config.rpcEndpoints;
    if (!Array.isArray(endpoints)) continue;

    for (const endpoint of endpoints) {
      if (isRecord(endpoint) && typeof endpoint.url === 'string') {
        endpoint.url = endpoint.url.replace(
          new RegExp(`:${DEFAULT_ANVIL_PORT}(\\/|$)`),
          `:${actualAnvilPort}$1`,
        );
      }
    }
  }
}

function rewriteMockServerUrls(
  data: Record<string, unknown>,
  actualMockPort: number | undefined,
): void {
  if (
    actualMockPort === undefined ||
    actualMockPort === FALLBACK_MOCKSERVER_PORT
  ) {
    return;
  }

  const oldUrl = `localhost:${FALLBACK_MOCKSERVER_PORT}`;
  const newUrl = `localhost:${actualMockPort}`;

  const engine = data.engine;
  if (!isRecord(engine)) return;

  const bgState = engine.backgroundState;
  if (!isRecord(bgState)) return;

  for (const key of Object.keys(bgState)) {
    const raw = JSON.stringify(bgState[key]);
    if (raw.includes(oldUrl)) {
      bgState[key] = JSON.parse(raw.split(oldUrl).join(newUrl));
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNestedValue(
  obj: Record<string, unknown>,
  ...keys: string[]
): unknown {
  let current: unknown = obj;
  for (const key of keys) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

export function walletStateToFixture(state: WalletState): Fixture {
  const { data, meta } = state;

  for (const key of REQUIRED_FIXTURE_STATE_KEYS) {
    const value = data[key];
    if (typeof value !== 'object' || value === null) {
      throw new Error(
        `Invalid WalletState: missing or malformed required FixtureState key "${key}".`,
      );
    }
  }

  const asyncState: Record<string, string> =
    meta?.version !== undefined ? { version: String(meta.version) } : {};

  return {
    state: data as FixtureState, // safe: runtime-validated above
    asyncState,
  };
}
