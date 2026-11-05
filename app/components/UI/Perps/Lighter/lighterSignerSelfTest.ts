// VERIFICATION ONLY (poc/perf-verify-lighter-v3). Never merge.
// Drives the real signer page on a device without a Lighter venue account and
// reports each step to the perf collector as a span.
import { LIGHTER_TESTNET_CHAIN_ID } from '@metamask/perps-controller/constants/lighterConfig';
import Engine from '../../../../core/Engine';
import {
  recordPerfSpanEnd,
  recordPerfSpanStart,
} from '../../../../core/Performance/perfSession';
import {
  isLighterSignerRequested,
  lighterSignerBridge,
} from './lighterSignerBridge';

const DELAY_AFTER_UNLOCK_MS = 25_000;
let unlocks = 0;

function words(value: string): string {
  return value.replace(/[^A-Za-z ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function recordSelfTestSpan(
  name: string,
  startedAt: number,
  ok: boolean,
  detail: string,
): void {
  const id = `u${unlocks} ${words(detail)}`.slice(0, 60);
  recordPerfSpanStart(name, id, startedAt);
  recordPerfSpanEnd(name, id, ok ? 'ok' : 'error');
}

async function step(name: string, run: () => Promise<unknown>) {
  const startedAt = Date.now();
  try {
    await run();
    recordSelfTestSpan(name, startedAt, true, 'ok');
    return true;
  } catch (error) {
    recordSelfTestSpan(
      name,
      startedAt,
      false,
      error instanceof Error ? error.message : 'unknown',
    );
    return false;
  }
}

async function runSelfTest(): Promise<void> {
  const requested = isLighterSignerRequested();
  recordSelfTestSpan(
    'LighterSelfTest before first call',
    Date.now(),
    !requested,
    requested ? 'page already requested' : 'page not requested',
  );
  const created = await step('LighterSelfTest createClient', () =>
    lighterSignerBridge.createClient({
      chainId: LIGHTER_TESTNET_CHAIN_ID,
      accountIndex: 1,
      nonce: 0,
      apiKeyIndex: 3,
    }),
  );
  if (created) {
    await step('LighterSelfTest createAuthToken', () =>
      lighterSignerBridge.execute({
        function: '_createAuthToken',
        params: [1, 3],
      }),
    );
  }
}

/** Run the self-test 25 s after every unlock; cancel it on lock. */
export function startLighterSignerSelfTest(): () => void {
  const messenger = Engine.controllerMessenger;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onUnlock = () => {
    unlocks += 1;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      runSelfTest().catch(() => undefined);
    }, DELAY_AFTER_UNLOCK_MS);
  };
  const onLock = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  messenger.subscribe('KeyringController:unlock', onUnlock);
  messenger.subscribe('KeyringController:lock', onLock);
  return () => {
    onLock();
    messenger.tryUnsubscribe('KeyringController:unlock', onUnlock);
    messenger.tryUnsubscribe('KeyringController:lock', onLock);
  };
}
