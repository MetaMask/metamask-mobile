/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'node:child_process';

import {
  IDB_INSTALL_HINT,
  isIdbAvailable,
  isIdbCompanionAvailable,
} from './environment-checks';

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
  remediation?: string;
}

export interface DoctorReport {
  ok: boolean;
  checks: DoctorCheck[];
}

function isSimctlAvailable(): boolean {
  try {
    execFileSync('xcrun', ['simctl', 'help'], {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function countBootedSimulators(): number | null {
  try {
    const output = execFileSync(
      'xcrun',
      ['simctl', 'list', 'devices', 'booted', '--json'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const parsed = JSON.parse(output) as {
      devices?: Record<string, { state?: string }[]>;
    };
    return Object.values(parsed.devices ?? {})
      .flat()
      .filter((entry) => entry.state === 'Booted').length;
  } catch {
    return null;
  }
}

export function collectDoctorReport(): DoctorReport {
  const checks: DoctorCheck[] = [];

  const simctlOk = isSimctlAvailable();
  checks.push({
    name: 'Xcode command-line tools (xcrun simctl)',
    ok: simctlOk,
    detail: simctlOk ? 'available' : '`xcrun simctl` not found',
    remediation: simctlOk
      ? undefined
      : 'Install Xcode from the Mac App Store and run `xcode-select --install`.',
  });

  const idbOk = isIdbAvailable();
  checks.push({
    name: 'idb (fb-idb CLI)',
    ok: idbOk,
    detail: idbOk ? 'available' : '`idb` not found on PATH or in Homebrew paths',
    remediation: idbOk ? undefined : `Install idb: ${IDB_INSTALL_HINT}`,
  });

  const companionOk = isIdbCompanionAvailable();
  checks.push({
    name: 'idb_companion (daemon)',
    ok: companionOk,
    detail: companionOk ? 'available' : '`idb_companion` not found',
    remediation: companionOk
      ? undefined
      : 'Install idb_companion: brew tap facebook/fb && brew install idb-companion',
  });

  const bootedCount = simctlOk ? countBootedSimulators() : null;
  const simulatorOk = bootedCount !== null && bootedCount > 0;
  checks.push({
    name: 'Booted iOS Simulator',
    ok: simulatorOk,
    detail:
      bootedCount === null
        ? 'unable to query simulators'
        : bootedCount === 0
          ? 'no simulator is booted'
          : `${bootedCount} booted`,
    remediation: simulatorOk
      ? undefined
      : 'Boot a simulator: `xcrun simctl boot <UDID>` (or open Xcode > Window > Devices and Simulators).',
  });

  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = report.checks.map((check) => {
    const status = check.ok ? 'PASS' : 'FAIL';
    const base = `[${status}] ${check.name} — ${check.detail}`;
    return check.remediation ? `${base}\n       → ${check.remediation}` : base;
  });

  lines.push('');
  lines.push(
    report.ok
      ? 'All iOS visual-testing prerequisites satisfied.'
      : 'Some prerequisites are missing. Fix the items marked FAIL above, then re-run `yarn mm:doctor`.',
  );

  return lines.join('\n');
}
