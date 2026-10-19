/* eslint-disable import-x/no-extraneous-dependencies */
import {
  fetchDiscoveryTargets,
  selectHermesTarget,
  type HermesTarget,
} from '@metamask/device-mcp';

const DEFAULT_PROBE_INTERVAL_MS = 500;
const DEFAULT_PROBE_CEILING_MS = 3_000;
const DEFAULT_FETCH_TIMEOUT_MS = 2_000;
const DEFAULT_LIVENESS_TIMEOUT_MS = 5_000;

export type ProbeHermesHealthyInput = {
  port: number;
  appId: string;
  pinnedDeviceId?: string;
  intervalMs?: number;
  ceilingMs?: number;
  fetchTimeoutMs?: number;
};

export type ProbeHermesHealthyResult = {
  healthy: boolean;
  target?: HermesTarget;
  pinnedDeviceId?: string;
  reason?: string;
};

export type ProbeHermesHealthy = typeof probeHermesHealthy;

/**
 * Bounded poll for a healthy Hermes target matching `appId` on the given
 * Metro port. Repeats `fetchDiscoveryTargets` + `selectHermesTarget` every
 * `intervalMs` until a healthy target is found or `ceilingMs` elapses.
 *
 * Persisting failure for the full ceiling (e.g. release build with no
 * Hermes inspector, or genuinely detached app) yields `{ healthy: false }`
 * with the last failure `reason`.
 */
export async function probeHermesHealthy(
  input: ProbeHermesHealthyInput,
): Promise<ProbeHermesHealthyResult> {
  const intervalMs = input.intervalMs ?? DEFAULT_PROBE_INTERVAL_MS;
  const ceilingMs = input.ceilingMs ?? DEFAULT_PROBE_CEILING_MS;
  const fetchTimeoutMs = input.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const deadline = Date.now() + ceilingMs;
  let lastReason = 'HERMES_TARGET_NOT_FOUND';

  while (Date.now() < deadline) {
    try {
      const targets = await fetchDiscoveryTargets(input.port, fetchTimeoutMs);
      const selection = selectHermesTarget(
        targets,
        input.appId,
        input.pinnedDeviceId,
      );

      if (selection.ok) {
        const logicalDeviceId =
          selection.target.reactNative?.logicalDeviceId;
        return {
          healthy: true,
          target: selection.target,
          pinnedDeviceId: logicalDeviceId ?? input.pinnedDeviceId,
        };
      }

      lastReason = selection.code;
    } catch (error) {
      lastReason =
        error instanceof Error ? error.message : 'discovery fetch failed';
    }

    const remaining = deadline - Date.now();
    if (remaining > 0) {
      await sleep(Math.min(intervalMs, remaining));
    }
  }

  return { healthy: false, reason: lastReason };
}

/**
 * Verifies that the Hermes runtime at the given CDP WebSocket URL is actively
 * executing JavaScript by sending a single `Runtime.evaluate` (`1+1`) and
 * checking for a prompt result.
 *
 * Feature-detects `globalThis.WebSocket` — on Node 20 without
 * `--experimental-websocket` the global is absent, and this function degrades
 * gracefully by returning `false` (callers treat this as "cannot verify
 * liveness" and fall back to target-presence-only health).
 */
export async function verifyJsLiveness(
  webSocketDebuggerUrl: string,
  timeoutMs = DEFAULT_LIVENESS_TIMEOUT_MS,
): Promise<boolean> {
  if (typeof globalThis.WebSocket !== 'function') {
    process.stderr.write(
      '[mm-mobile] hermes-health: global WebSocket unavailable (Node 20 needs --experimental-websocket); skipping JS liveness probe\n',
    );
    return false;
  }

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const WebSocketCtor = globalThis.WebSocket;
    let ws: WebSocket;
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (
        ws &&
        (ws.readyState === WebSocketCtor.OPEN ||
          ws.readyState === WebSocketCtor.CONNECTING)
      ) {
        ws.close();
      }
    };

    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    timeoutId = setTimeout(() => finish(false), timeoutMs);

    try {
      ws = new WebSocketCtor(webSocketDebuggerUrl);
    } catch {
      finish(false);
      return;
    }

    ws.onopen = () => {
      const cdpMessage = JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: '1+1', returnByValue: true },
      });
      ws.send(cdpMessage);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(
          typeof event.data === 'string' ? event.data : String(event.data),
        ) as { id?: number; result?: { value?: unknown } };
        if (payload.id === 1 && payload.result) {
          finish(true);
        }
      } catch {
        // Ignore non-JSON or unexpected messages; keep waiting for the result.
      }
    };

    ws.onerror = () => finish(false);
    ws.onclose = () => finish(false);
  });
}

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
