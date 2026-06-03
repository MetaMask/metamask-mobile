// Metro start, CDP connect, wallet setup — shells out to start-metro.sh /
// cdp-bridge.js / setup-wallet.sh; owns the sequencing, Metro health, and CDP wait.

import { execFileSync, spawn, spawnSync } from 'child_process';
import { appendFileSync, existsSync } from 'fs';
import { join } from 'path';
import { initStageLog, type Logger } from './log';
import { killTree } from './proc';
import type { Ctx } from './types';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// Metro is healthy only when /status actually answers. A port-bound but hung
// Metro (e.g. deadlocked while building the first bundle) fails this even though
// it still holds the port — which is exactly what start-metro.sh's reuse probe
// can miss.
function metroResponds(port: number): boolean {
  const r = spawnSync('curl', ['-s', '--max-time', '3', `http://localhost:${port}/status`], {
    encoding: 'utf8',
  });
  return (r.stdout ?? '').includes('packager-status:running');
}

async function metroRespondsWithin(port: number, seconds: number): Promise<boolean> {
  for (let i = 0; i < seconds; i += 1) {
    if (metroResponds(port)) return true;
    await sleep(1000);
  }
  return false;
}

function runStartMetro(ctx: Ctx, launch: boolean, logger: Logger): boolean {
  const args = [join(ctx.scripts, 'start-metro.sh'), '--platform', ctx.plat];
  if (launch) args.push('--launch');
  const r = spawnSync('bash', args, { cwd: ctx.root, stdio: 'inherit' });
  if (r.error) {
    logger.fail(`start-metro.sh failed: ${r.error.message}`);
  }
  return r.status === 0;
}

// Kill whatever holds the Metro port so a hung instance can be replaced.
async function freeMetroPort(port: number): Promise<void> {
  let pid: number | null = null;
  try {
    const out = execFileSync('lsof', ['-iTCP:' + port, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' });
    const first = out.split('\n').map((s) => s.trim()).find(Boolean);
    pid = first ? Number.parseInt(first, 10) : null;
  } catch {
    pid = null;
  }
  if (pid != null && Number.isInteger(pid)) await killTree(pid);
}

// Start Metro and confirm it actually answers /status. start-metro.sh reuses any
// port-bound instance, so a previously-hung Metro can slip through — restart it
// once and surface its log if it still won't respond.
export async function startMetro(ctx: Ctx, logger: Logger): Promise<void> {
  logger.step('Starting Metro', `Bundler on port ${ctx.port} → logs at ${ctx.logFile}`);
  logger.stageLog(ctx.logFile);
  const firstStartOk = runStartMetro(ctx, ctx.doLaunch, logger);
  if (firstStartOk && (await metroRespondsWithin(ctx.port, 10))) {
    logger.ok(`Metro running on port ${ctx.port}`);
    return;
  }

  const metroRespondingAfterFailure = await metroRespondsWithin(ctx.port, 3);
  if (metroRespondingAfterFailure) {
    if (firstStartOk) {
      logger.ok(`Metro running on port ${ctx.port}`);
      return;
    }
    logger.warn('start-metro.sh failed after Metro became healthy — retrying launch/start once');
  } else {
    logger.warn(`Metro on ${ctx.port} is bound but not answering /status — restarting`);
    logger.tail(ctx.logFile, 15);
    await freeMetroPort(ctx.port);
  }

  const secondStartOk = runStartMetro(ctx, ctx.doLaunch, logger);
  if (!secondStartOk) {
    logger.tail(ctx.logFile, 25);
    logger.fail('start-metro.sh failed after retry');
  }
  if (!(await metroRespondsWithin(ctx.port, 15))) {
    logger.tail(ctx.logFile, 25);
    logger.fail(`Metro on ${ctx.port} not responding after restart — see ${ctx.logFile}`);
  }
  logger.ok(`Metro running on port ${ctx.port} (restarted)`);
}

function cdpStatus(ctx: Ctx): string {
  const r = spawnSync('node', [join(ctx.scripts, 'cdp-bridge.js'), 'status'], {
    cwd: ctx.root,
    encoding: 'utf8',
    env: {
      ...process.env,
      CDP_TIMEOUT: String(ctx.cdpStatusTimeoutMs),
      CDP_DISCOVERY_RETRIES: String(ctx.cdpDiscoveryRetries),
    },
  });
  return (r.stdout ?? '') + (r.stderr ?? '');
}

// Count CDP targets on a port — diagnostic for the "app registered on 8081
// instead of the worktree port" failure (stale expo dev server).
function probeCdpPort(port: number): number {
  const r = spawnSync('curl', ['-s', '--max-time', '2', `http://localhost:${port}/json/list`], {
    encoding: 'utf8',
  });
  try {
    const arr = JSON.parse(r.stdout || '[]') as unknown[];
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

export async function connectCdp(ctx: Ctx, logger: Logger): Promise<void> {
  logger.step('Connecting CDP', 'Waiting for app to expose debug target');
  logger.stageLog(ctx.cdpLog);
  initStageLog(ctx.cdpLog, `$ node ${ctx.scripts}/cdp-bridge.js status`);

  let start = Date.now();
  let retry = 0;
  let metroRestarts = 0;
  let connected = false;
  while (Date.now() - start < ctx.cdpWaitTimeout * 1000) {
    if (/"route"/.test(cdpStatus(ctx))) {
      connected = true;
      logger.ok('CDP connected');
      break;
    }
    // The app loads its JS bundle from Metro; if Metro hangs mid-bundle the debug
    // target never appears and we'd otherwise wait blind. Detect a dead Metro,
    // surface its log, and recover once.
    if (metroRestarts < 1 && Date.now() - start > 25_000 && !metroResponds(ctx.port)) {
      logger.warn('Metro stopped responding while the app loaded its bundle — restarting + relaunching');
      logger.tail(ctx.logFile, 15);
      await freeMetroPort(ctx.port);
      runStartMetro(ctx, true, logger);
      metroRestarts += 1;
      start = Date.now();
      retry = 0;
      continue;
    }
    await sleep(1000);
    retry += 1;
    if (retry === 5) logger.dim('Still waiting... app may still be loading JS bundle');
    if (retry === 15) logger.dim('Taking longer than usual — check device');
  }

  if (!connected) {
    logger.plain();
    logger.plain('  CDP timeout — diagnostic probe:');
    const ports = ctx.port === 8081 ? [ctx.port] : [ctx.port, 8081];
    let onSelf = 0;
    let onOther = 0;
    for (const p of ports) {
      const n = probeCdpPort(p);
      logger.dim(`port ${p}: ${n} targets`);
      if (p === ctx.port) onSelf = n;
      else onOther = n;
    }
    if (onSelf === 0 && onOther !== 0) {
      logger.warn(`Targets found on 8081 but none on ${ctx.port} — a stale 'expo run' without --port is likely holding 8081`);
    }
    logger.plain(`  Metro responds: ${metroResponds(ctx.port)} — last 25 lines of ${ctx.logFile}:`);
    logger.tail(ctx.logFile, 25);
    logger.fail(`CDP did not become available after ${ctx.cdpWaitTimeout}s — see ${ctx.cdpLog}`);
  }

  // status may be object or array; warn (don't fail) if the platform is absent.
  const status = cdpStatus(ctx);
  if (!status.includes(`"${ctx.plat}"`)) {
    logger.warn(`CDP did not find ${ctx.plat} app — it may still be loading`);
  }
  await sleep(2000);
}

async function runWalletSetup(ctx: Ctx, args: string[]): Promise<number> {
  const child = spawn('bash', [join(ctx.scripts, 'setup-wallet.sh'), ...args], {
    cwd: ctx.root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const onData = (buf: Buffer, stream: NodeJS.WriteStream): void => {
    appendFileSync(ctx.walletLog, buf);
    stream.write(buf);
  };
  child.stdout.on('data', (buf: Buffer) => onData(buf, process.stdout));
  child.stderr.on('data', (buf: Buffer) => onData(buf, process.stderr));

  return await new Promise<number>((resolve) => {
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', (error) => {
      const message = `setup-wallet.sh spawn failed: ${error.message}\n`;
      appendFileSync(ctx.walletLog, message);
      process.stderr.write(message);
      resolve(1);
    });
  });
}

export async function setupWallet(ctx: Ctx, logger: Logger): Promise<void> {
  if (ctx.flags.walletSetup) {
    logger.step('Setting up wallet', `Configuring from ${ctx.flags.walletFixture}`);
    logger.stageLog(ctx.walletLog);
    const fixtureFlag =
      ctx.flags.walletFixture !== '.agent/wallet-fixture.json'
        ? ['--fixture', ctx.flags.walletFixture]
        : [];
    if (existsSync(join(ctx.root, ctx.flags.walletFixture)) || fixtureFlag.length) {
      initStageLog(
        ctx.walletLog,
        `$ bash ${ctx.scripts}/setup-wallet.sh ${fixtureFlag.join(' ')}`.trim(),
      );
      const status = await runWalletSetup(ctx, fixtureFlag);
      if (status === 0) {
        logger.ok('Wallet configured');
      } else {
        logger.tail(ctx.walletLog, 30);
        logger.fail(`Wallet setup failed — see ${ctx.walletLog}`);
      }
    } else {
      logger.fail(`No fixture at ${ctx.flags.walletFixture}`);
    }
  } else if (ctx.flags.walletPw) {
    logger.step('Unlocking wallet', 'Using provided password');
    const r = spawnSync('node', [join(ctx.scripts, 'cdp-bridge.js'), 'unlock', ctx.flags.walletPw], {
      cwd: ctx.root,
      stdio: 'ignore',
    });
    if (r.status === 0) logger.ok('Wallet unlocked');
    else logger.warn('Could not unlock wallet');
  }
}
