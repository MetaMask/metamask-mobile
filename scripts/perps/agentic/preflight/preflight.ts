// Orchestrator. Prepares a ready-to-code worktree: deps reconciled, app
// built/installed, Metro + CDP up, wallet configured. See ./README.md.

import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { buildCtx, modeLine, resolvePath } from './modules/env';
import { decideDeps, reconcile, runCleanSetup } from './modules/deps';
import { restoreMainNoise } from './modules/git';
import { Logger, PreflightError } from './modules/log';
import { sweepPort } from './modules/proc';
import { runIos } from './modules/ios';
import { runAndroid } from './modules/android';
import { connectCdp, setupWallet, startMetro } from './modules/runtime';
import type { Ctx } from './modules/types';

function validateFixture(ctx: Ctx, logger: Logger): void {
  const path = resolvePath(ctx.root, ctx.flags.walletFixture);
  if (!existsSync(path)) {
    logger.fail(
      `Wallet fixture not found: ${ctx.flags.walletFixture} — copy scripts/perps/agentic/wallet-fixture.example.json to .agent/wallet-fixture.json`,
    );
  }
  let data: { password?: string; accounts?: { type?: string; value?: string }[] };
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return logger.fail(`Invalid JSON in ${ctx.flags.walletFixture}`);
  }
  if (!data.password) logger.fail(`Fixture missing 'password' field: ${ctx.flags.walletFixture}`);
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];
  accounts.forEach((a, i) => {
    if (a.type !== 'mnemonic' && a.type !== 'privateKey') {
      logger.fail(`accounts[${i}].type must be 'mnemonic' or 'privateKey' (got '${a.type ?? 'empty'}')`);
    }
    if (!a.value) logger.fail(`accounts[${i}].value is empty`);
  });
  logger.ok(`Fixture validated: ${ctx.flags.walletFixture} (password + ${accounts.length} accounts)`);
}

async function main(): Promise<void> {
  // Resolve the worktree root from this script's path (cwd-independent, and
  // commonjs-safe — avoids import.meta which the repo tsconfig forbids).
  const root = resolve(dirname(process.argv[1] ?? ''), '../../../..');
  const ctx = buildCtx(root, process.argv.slice(2));
  const logger = new Logger();

  // Restore setup-noise on every exit — success, thrown failure, or Ctrl-C.
  // `expo run:ios` rewrites tsconfig.json ("extends": "expo/tsconfig.base") and
  // pod install bumps Podfile.lock; neither should be committed. Critically, a
  // polluted tsconfig.json bricks the NEXT ts-node run (TS5098), so a run that
  // failed before this point (e.g. CDP timeout) used to leave the tool unable to
  // start. No-op off main. Idempotent. See modules/git.ts.
  const restoreNoise = (): void =>
    restoreMainNoise(ctx.root, ['tsconfig.json', 'ios/Podfile.lock'], logger);
  const onSignal = (sig: NodeJS.Signals): void => {
    restoreNoise();
    process.exit(sig === 'SIGINT' ? 130 : 143);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    if (ctx.doClean && ctx.checkOnly) {
      logger.fail('--check-only conflicts with --clean / --mode clean (would mutate node_modules + build artifacts)');
    }
    if (ctx.flags.walletSetup) validateFixture(ctx, logger);

    mkdirSync(ctx.logDir, { recursive: true });

    const decision = decideDeps(ctx, logger);

    let total = 4; // device + app + metro + cdp
    if (ctx.doClean) total += 1;
    if (decision.jsDepsStale || decision.setupStale) total += 1;
    if (ctx.flags.walletSetup || ctx.flags.walletPw) total += 1;
    logger.setTotalSteps(total);

    logger.header(ctx.port, ctx.plat, modeLine(ctx.mode, ctx.checkOnly));

    await sweepPort(ctx.port, 'worktree Metro', logger, ctx.checkOnly);
    if (ctx.port !== 8081) await sweepPort(8081, 'expo default', logger, ctx.checkOnly);

    if (ctx.doClean) await runCleanSetup(ctx, logger);
    else await reconcile(ctx, logger, decision);

    if (ctx.plat === 'ios') await runIos(ctx, logger);
    else await runAndroid(ctx, logger);

    // --check-only is read-only: the probes above fail loud on mismatch; never run
    // the state-changing Metro/CDP/wallet steps.
    if (ctx.checkOnly) {
      logger.plain();
      logger.plain(`=== Preflight check-only passed === (platform ${ctx.plat})`);
      return;
    }

    await startMetro(ctx, logger);
    await connectCdp(ctx, logger);
    setupWallet(ctx, logger);

    logger.plain();
    logger.plain('=== Preflight complete ===');
    logger.plain(`  Platform   ${ctx.plat}`);
    logger.plain(`  Metro      http://localhost:${ctx.port}/status`);
    logger.plain(`  Logs       tail -f ${ctx.logFile}`);
    logger.plain(`  CDP        node ${ctx.scripts}/cdp-bridge.js status`);
    for (const { name, seconds } of logger.finishTimings()) {
      logger.plain(`  ${name}: ${seconds}s`);
    }
  } finally {
    restoreNoise();
  }
}

main().catch((err: unknown) => {
  if (err instanceof PreflightError) {
    process.stdout.write(`  \x1b[0;31m✗\x1b[0m ${err.message}\n`);
    process.exit(1);
  }
  process.stderr.write(`ERROR: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(2);
});
