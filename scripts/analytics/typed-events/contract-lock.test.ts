import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertContractMatchesLock,
  readContractLock,
  type ContractLock,
  type ContractLockVerificationInput,
} from './contract-lock';

const createLock = (): ContractLock => ({
  assetName: 'metamask-mobile.json',
  assetSha256: `sha256:${'a'.repeat(64)}`,
  contractFormatVersion: 1,
  contractHash: `sha256:${'b'.repeat(64)}`,
  lockVersion: 1,
  platform: 'mobile',
  releaseTag: 'analytics-contracts-test',
  releaseUrl:
    'https://github.com/Consensys/segment-schema/releases/tag/analytics-contracts-test',
  ruleCount: 2,
  sourceSha: 'a'.repeat(40),
  trackingPlanId: 'tp_test',
});

const createInput = (): ContractLockVerificationInput => ({
  assetSha256: `sha256:${'a'.repeat(64)}`,
  contract: {
    formatVersion: 1,
    hash: `sha256:${'b'.repeat(64)}`,
    platform: 'mobile',
    ruleCount: 2,
    sourceSha: 'a'.repeat(40),
    trackingPlan: {
      id: 'tp_test',
    },
  },
  releaseTag: 'analytics-contracts-test',
  releaseUrl:
    'https://github.com/Consensys/segment-schema/releases/tag/analytics-contracts-test',
});

describe('contract lock', () => {
  const roots: string[] = [];

  afterEach(() => {
    roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
  });

  it('reads valid lock metadata', () => {
    const root = mkdtempSync(join(tmpdir(), 'analytics-contract-lock-'));
    roots.push(root);
    const filePath = join(root, 'contract.lock.json');
    const lock = createLock();

    writeFileSync(filePath, JSON.stringify(lock));

    expect(readContractLock(filePath)).toEqual(lock);
  });

  it('rejects a lock for a non-Mobile asset', () => {
    const root = mkdtempSync(join(tmpdir(), 'analytics-contract-lock-'));
    roots.push(root);
    const filePath = join(root, 'contract.lock.json');

    writeFileSync(
      filePath,
      JSON.stringify({
        ...createLock(),
        assetName: 'metamask-extension.json',
      }),
    );

    expect(() => readContractLock(filePath)).toThrow(
      'Expected Mobile contract asset',
    );
  });

  it('rejects a verified contract that differs from the lock', () => {
    const lock = createLock();
    const input = {
      ...createInput(),
      contract: {
        ...createInput().contract,
        ruleCount: 3,
      },
    };

    expect(() => assertContractMatchesLock(lock, input)).toThrow(
      'Contract lock mismatch for ruleCount',
    );
  });
});
