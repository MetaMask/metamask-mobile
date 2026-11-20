import {
  waitForWalletHomeReady,
  type WalletHomeWaitDeps,
} from './wallet-home-wait';

interface FakeDeps extends WalletHomeWaitDeps {
  clock: number;
}

/**
 * Simulates the TestMu run: each readiness pass costs `passMs` while a sheet
 * covers wallet home, and the dismiss tap costs `dismissMs`.
 */
const createDeps = ({
  passMs,
  dismissMs,
  sheetUpUntilDismissed,
}: {
  passMs: number;
  dismissMs: number;
  sheetUpUntilDismissed: boolean;
}): FakeDeps & { dismissCalls: number } => {
  let sheetUp = sheetUpUntilDismissed;
  const deps = {
    clock: 0,
    dismissCalls: 0,
    now: () => deps.clock,
    sleep: async (ms: number) => {
      deps.clock += ms;
    },
    onNotReady: async () => undefined,
    isReady: async () => {
      deps.clock += sheetUp ? passMs : 1_000;
      return !sheetUp;
    },
    dismissInterruption: async () => {
      deps.dismissCalls++;
      if (!sheetUp) {
        deps.clock += 1_000;
        return false;
      }
      deps.clock += dismissMs;
      sheetUp = false;
      return true;
    },
  };
  return deps;
};

describe('waitForWalletHomeReady', () => {
  it('re-checks readiness when the sheet is dismissed after the original deadline', async () => {
    // Matches the TestMu traces: one 16s pass, then a 15s dismiss tap.
    const deps = createDeps({
      passMs: 16_000,
      dismissMs: 15_000,
      sheetUpUntilDismissed: true,
    });

    const ready = await waitForWalletHomeReady(deps, { timeoutMs: 30_000 });

    expect(ready).toBe(true);
    expect(deps.clock).toBeGreaterThan(30_000);
  });

  it('checks for a sheet after the first failed pass', async () => {
    const deps = createDeps({
      passMs: 16_000,
      dismissMs: 1_000,
      sheetUpUntilDismissed: true,
    });

    await waitForWalletHomeReady(deps, { timeoutMs: 30_000 });

    expect(deps.dismissCalls).toBe(1);
  });

  it('returns true without checking for sheets when wallet home is ready', async () => {
    const deps = createDeps({
      passMs: 16_000,
      dismissMs: 1_000,
      sheetUpUntilDismissed: false,
    });

    expect(await waitForWalletHomeReady(deps, { timeoutMs: 30_000 })).toBe(
      true,
    );
    expect(deps.dismissCalls).toBe(0);
  });

  it('does not let a slow empty probe consume the readiness budget', async () => {
    const deps = createDeps({
      passMs: 100,
      dismissMs: 4_000,
      sheetUpUntilDismissed: false,
    });
    let checks = 0;
    deps.isReady = async () => {
      checks += 1;
      deps.clock += 100;
      return checks === 2;
    };
    deps.dismissInterruption = async () => {
      deps.clock += 4_000;
      return false;
    };

    const ready = await waitForWalletHomeReady(deps, { timeoutMs: 1_000 });

    expect(ready).toBe(true);
    expect(checks).toBe(2);
  });

  it('stops extending the deadline when a sheet keeps reappearing', async () => {
    const deps = createDeps({
      passMs: 5_000,
      dismissMs: 1_000,
      sheetUpUntilDismissed: true,
    });
    deps.isReady = async () => {
      deps.clock += 5_000;
      return false;
    };
    deps.dismissInterruption = async () => {
      deps.dismissCalls++;
      deps.clock += 1_000;
      return true;
    };

    const ready = await waitForWalletHomeReady(deps, {
      timeoutMs: 30_000,
      maxDismissals: 3,
    });

    expect(ready).toBe(false);
    expect(deps.dismissCalls).toBe(3);
  });

  it('times out at the original deadline when nothing is dismissed', async () => {
    const deps = createDeps({
      passMs: 16_000,
      dismissMs: 1_000,
      sheetUpUntilDismissed: false,
    });
    deps.isReady = async () => {
      deps.clock += 5_000;
      return false;
    };

    expect(await waitForWalletHomeReady(deps, { timeoutMs: 30_000 })).toBe(
      false,
    );
    expect(deps.clock).toBeLessThan(40_000);
  });
});
