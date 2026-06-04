// Terminal output: colours, step timing, and live-log tailing.

import { spawn } from 'child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const C = {
  green: '\x1b[0;32m',
  red: '\x1b[0;31m',
  yellow: '\x1b[0;33m',
  blue: '\x1b[0;34m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  nc: '\x1b[0m',
} as const;

// Fatal preflight error. The entry point prints the ✗ line and exits 1;
// throwing (vs process.exit) lets locks and cleanup unwind first.
export class PreflightError extends Error {}

const isTty = (): boolean => Boolean(process.stdout.isTTY);

// Live 3-line tail of a growing log file: reserves N rows on a TTY and redraws
// them in place. No-op off a TTY (output still lands in the file).
class LiveTail {
  private readonly log: string;
  private readonly n: number;
  private timer: NodeJS.Timeout | null = null;
  private started = false;

  constructor(log: string, n: number) {
    this.log = log;
    this.n = n;
    if (!isTty()) return;
    for (let i = 0; i < n; i += 1) process.stdout.write('\n');
    this.started = true;
    this.timer = setInterval(() => this.render(), 750);
    if (this.timer.unref) this.timer.unref();
  }

  poke(): void {
    // Rendered on the interval; nothing to do per-chunk.
  }

  private render(): void {
    if (!this.started) return;
    const cols = process.stdout.columns ?? 120;
    const width = Math.max(20, cols - 6);
    let lines: string[] = [];
    if (existsSync(this.log)) {
      lines = readFileSync(this.log, 'utf8')
        .split('\n')
        .filter((l) => l.length > 0)
        .slice(-this.n)
        // eslint-disable-next-line no-control-regex
        .map((l) => l.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').replace(/\t/g, '  '))
        .map((l) => (l.length > width ? l.slice(0, width) : l));
    }
    process.stdout.write(`\x1b[${this.n}A\x1b[J`);
    for (let i = 0; i < this.n; i += 1) {
      const l = lines[i] ?? '';
      process.stdout.write(`    ${C.dim}${l}${C.nc}\n`);
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Leave the frame's last contents in place so the final build output stays
    // visible, matching the bash behaviour of a settled tail.
    this.started = false;
  }
}

export class Logger {
  private totalSteps = 0;
  private currentStep = 0;
  private currentStepName = '';
  private stepStart = 0;
  private readonly timings: { name: string; seconds: number }[] = [];

  setTotalSteps(n: number): void {
    this.totalSteps = n;
  }

  ok(msg: string): void {
    process.stdout.write(`  ${C.green}✓${C.nc} ${msg}\n`);
  }
  warn(msg: string): void {
    process.stdout.write(`  ${C.yellow}⚠${C.nc} ${msg}\n`);
  }
  // Raise a fatal error. The entry point prints the ✗ line and exits 1.
  fail(msg: string): never {
    throw new PreflightError(msg);
  }
  plain(msg = ''): void {
    process.stdout.write(`${msg}\n`);
  }
  dim(msg: string): void {
    process.stdout.write(`  ${C.dim}${msg}${C.nc}\n`);
  }
  stageLog(path: string): void {
    process.stdout.write(`  ${C.dim}Log: ${path}${C.nc}\n`);
  }
  // Indented last-N lines of a log file, for failure diagnostics.
  tail(path: string, n = 20): void {
    if (!existsSync(path)) return;
    for (const l of readFileSync(path, 'utf8').split('\n').slice(-n)) {
      process.stdout.write(`    ${l}\n`);
    }
  }

  private now(): number {
    return Math.floor(Date.now() / 1000);
  }

  // Begin a new step; records the previous step's elapsed time.
  step(name: string, detail?: string): void {
    if (this.currentStepName) {
      this.timings.push({ name: this.currentStepName, seconds: this.now() - this.stepStart });
    }
    this.stepStart = this.now();
    this.currentStep += 1;
    this.currentStepName = name;
    process.stdout.write('\n');
    process.stdout.write(
      `${C.blue}${C.bold}[${this.currentStep}/${this.totalSteps}]${C.nc} ${C.bold}${name}${C.nc}\n`,
    );
    if (detail) process.stdout.write(`  ${C.dim}${detail}${C.nc}\n`);
  }

  // Close out the final step and return all timings for the summary.
  finishTimings(): { name: string; seconds: number }[] {
    if (this.currentStepName) {
      this.timings.push({ name: this.currentStepName, seconds: this.now() - this.stepStart });
      this.currentStepName = '';
    }
    return this.timings;
  }

  header(port: number, plat: string, modeLine: string): void {
    process.stdout.write('\n');
    process.stdout.write(`${C.bold}=== MetaMask Mobile Preflight (ts) ===${C.nc}\n`);
    process.stdout.write(`  Port: ${port} | Platform: ${plat}\n`);
    process.stdout.write(`  ${modeLine}\n`);
  }

  // Run a shell command, appending combined output to `logPath`, while showing a
  // live 3-line dim tail on a TTY. Resolves with the exit code; never rejects.
  async runWithLiveLog(logPath: string, cmd: string, cwd: string): Promise<number> {
    mkdirSync(dirname(logPath), { recursive: true });
    const child = spawn('bash', ['-c', cmd], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });

    const tail = new LiveTail(logPath, 3);
    const onData = (buf: Buffer): void => {
      appendFileSync(logPath, buf);
      tail.poke();
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    return await new Promise<number>((resolve) => {
      child.on('close', (code) => {
        tail.stop();
        resolve(code ?? 1);
      });
      child.on('error', () => {
        tail.stop();
        resolve(1);
      });
    });
  }
}

export { C };

// Write the literal first line (the `$ cmd` header) of a stage log.
export function initStageLog(path: string, firstLine: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${firstLine}\n`);
}
