/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'node:child_process';
import { collectDoctorReport, formatDoctorReport } from '../ios/doctor';

jest.mock('node:child_process', () => ({ execFileSync: jest.fn() }));

const mockedExecFileSync = jest.mocked(execFileSync);

interface Availability {
  simctl?: boolean;
  idb?: boolean;
  idbCompanion?: boolean;
  bootedSimulators?: number;
}

function notInstalled(): never {
  const error = new Error('spawn ENOENT') as NodeJS.ErrnoException;
  error.code = 'ENOENT';
  throw error;
}

function mockEnvironment(options: Availability): void {
  const {
    simctl = true,
    idb = true,
    idbCompanion = true,
    bootedSimulators = 1,
  } = options;

  mockedExecFileSync.mockImplementation((file, args) => {
    const values = (args as string[]) ?? [];
    const name = String(file);

    if (name.endsWith('idb_companion')) {
      return idbCompanion ? '' : notInstalled();
    }
    if (name.endsWith('idb')) {
      return idb ? '' : notInstalled();
    }
    if (name === 'xcrun' && values[1] === 'help') {
      return simctl ? '' : notInstalled();
    }
    if (name === 'xcrun' && values[1] === 'list') {
      const devices = Array.from({ length: bootedSimulators }, () => ({
        state: 'Booted',
      }));
      return JSON.stringify({ devices: { 'iOS 17': devices } });
    }
    throw new Error(`Unexpected command: ${name} ${values.join(' ')}`);
  });
}

describe('collectDoctorReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports ok when every prerequisite is satisfied', () => {
    mockEnvironment({});

    const report = collectDoctorReport();

    expect(report.ok).toBe(true);
    expect(report.checks.every((check) => check.ok)).toBe(true);
  });

  it('flags a missing idb with remediation', () => {
    mockEnvironment({ idb: false });

    const report = collectDoctorReport();

    expect(report.ok).toBe(false);
    const idbCheck = report.checks.find((check) =>
      check.name.includes('idb (fb-idb'),
    );
    expect(idbCheck?.ok).toBe(false);
    expect(idbCheck?.remediation).toContain('idb-companion');
  });

  it('treats an installed binary as available even when its probe exits non-zero', () => {
    // Regression: `idb_companion --version` exits 0, but `idb_companion --help`
    // exits 1. A real (non-ENOENT) failure must still count as installed.
    mockedExecFileSync.mockImplementation((file, args) => {
      const name = String(file);
      const values = (args as string[]) ?? [];
      if (name.endsWith('idb_companion')) {
        const error = new Error('non-zero exit') as Error & { status: number };
        error.status = 1;
        throw error;
      }
      if (name.endsWith('idb')) return '';
      if (name === 'xcrun' && values[1] === 'help') return '';
      if (name === 'xcrun' && values[1] === 'list') {
        return JSON.stringify({ devices: { 'iOS 17': [{ state: 'Booted' }] } });
      }
      throw new Error(`Unexpected command: ${name}`);
    });

    const report = collectDoctorReport();

    const companionCheck = report.checks.find((check) =>
      check.name.includes('idb_companion'),
    );
    expect(companionCheck?.ok).toBe(true);
    expect(report.ok).toBe(true);
  });

  it('flags no booted simulator without failing the idb check', () => {
    mockEnvironment({ bootedSimulators: 0 });

    const report = collectDoctorReport();

    expect(report.ok).toBe(false);
    const simCheck = report.checks.find((check) =>
      check.name.includes('Booted iOS Simulator'),
    );
    expect(simCheck?.ok).toBe(false);
    const idbCheck = report.checks.find((check) =>
      check.name.includes('idb (fb-idb'),
    );
    expect(idbCheck?.ok).toBe(true);
  });
});

describe('formatDoctorReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders PASS/FAIL lines and a summary', () => {
    mockEnvironment({ idb: false });

    const output = formatDoctorReport(collectDoctorReport());

    expect(output).toContain('[FAIL] idb (fb-idb CLI)');
    expect(output).toContain('[PASS] Xcode command-line tools');
    expect(output).toContain('yarn mm:doctor');
  });
});
