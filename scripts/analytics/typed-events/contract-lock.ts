import { readFileSync } from 'node:fs';
import type { MobileContract, TrackingPlanMetadata } from './contract';

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const SOURCE_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const RELEASE_PREFIX = 'analytics-contracts-';

export interface ContractLock {
  readonly assetName: 'metamask-mobile.json';
  readonly assetSha256: string;
  readonly contractFormatVersion: number;
  readonly contractHash: string;
  readonly lockVersion: 1;
  readonly platform: 'mobile';
  readonly releaseTag: string;
  readonly releaseUrl: string;
  readonly ruleCount: number;
  readonly sourceSha: string;
  readonly trackingPlanId: string;
}

export interface ContractLockVerificationInput {
  readonly assetSha256: string;
  readonly contract: Pick<
    MobileContract,
    | 'formatVersion'
    | 'platform'
    | 'sourceSha'
    | 'ruleCount'
    | 'hash'
  > & {
    readonly trackingPlan: Pick<TrackingPlanMetadata, 'id'>;
  };
  readonly releaseTag: string;
  readonly releaseUrl: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (
  object: Record<string, unknown>,
  key: string,
  path: string,
): string => {
  const value = object[key];

  if (typeof value !== 'string') {
    throw new Error(`Expected string at ${path}.${key}`);
  }

  return value;
};

const readInteger = (
  object: Record<string, unknown>,
  key: string,
  path: string,
): number => {
  const value = object[key];

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`Expected integer at ${path}.${key}`);
  }

  return value;
};

const readJsonObject = (filePath: string): Record<string, unknown> => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  } catch (error) {
    throw new Error(`Unable to parse contract lock '${filePath}': ${String(error)}`);
  }

  if (!isRecord(parsed)) {
    throw new Error(`Expected contract lock '${filePath}' to contain an object`);
  }

  return parsed;
};

const readSha256 = (
  object: Record<string, unknown>,
  key: string,
  path: string,
): string => {
  const value = readString(object, key, path);

  if (!SHA256_PATTERN.test(value)) {
    throw new Error(`Expected SHA-256 digest at ${path}.${key}`);
  }

  return value;
};

const readSourceSha = (
  object: Record<string, unknown>,
  key: string,
  path: string,
): string => {
  const value = readString(object, key, path);

  if (!SOURCE_SHA_PATTERN.test(value)) {
    throw new Error(`Expected Git commit SHA at ${path}.${key}`);
  }

  return value;
};

/**
 * Read and validate public metadata for one immutable Mobile contract release.
 *
 * @param filePath - Path to the lock metadata.
 * @returns The validated lock.
 */
export const readContractLock = (filePath: string): ContractLock => {
  const object = readJsonObject(filePath);
  const path = 'contractLock';
  const lockVersion = readInteger(object, 'lockVersion', path);
  const assetName = readString(object, 'assetName', path);
  const platform = readString(object, 'platform', path);
  const releaseTag = readString(object, 'releaseTag', path);

  if (lockVersion !== 1) {
    throw new Error(`Unsupported contract lock version '${lockVersion}'`);
  }

  if (assetName !== 'metamask-mobile.json') {
    throw new Error(`Expected Mobile contract asset, got '${assetName}'`);
  }

  if (platform !== 'mobile') {
    throw new Error(`Expected Mobile contract platform, got '${platform}'`);
  }

  if (!releaseTag.startsWith(RELEASE_PREFIX)) {
    throw new Error(`Expected analytics contract release tag, got '${releaseTag}'`);
  }

  return {
    assetName,
    assetSha256: readSha256(object, 'assetSha256', path),
    contractFormatVersion: readInteger(object, 'contractFormatVersion', path),
    contractHash: readSha256(object, 'contractHash', path),
    lockVersion: 1,
    platform: 'mobile',
    releaseTag,
    releaseUrl: readString(object, 'releaseUrl', path),
    ruleCount: readInteger(object, 'ruleCount', path),
    sourceSha: readSourceSha(object, 'sourceSha', path),
    trackingPlanId: readString(object, 'trackingPlanId', path),
  };
};

const assertEqual = (
  label: string,
  actual: string | number,
  expected: string | number,
): void => {
  if (actual !== expected) {
    throw new Error(
      `Contract lock mismatch for ${label}: expected '${expected}', got '${actual}'`,
    );
  }
};

/**
 * Verify downloaded release metadata and contract content against a lock.
 *
 * @param lock - Expected immutable release metadata.
 * @param input - Resolved release and verified contract values.
 */
export const assertContractMatchesLock = (
  lock: ContractLock,
  input: ContractLockVerificationInput,
): void => {
  assertEqual('releaseTag', input.releaseTag, lock.releaseTag);
  assertEqual('releaseUrl', input.releaseUrl, lock.releaseUrl);
  assertEqual('assetSha256', input.assetSha256, lock.assetSha256);
  assertEqual(
    'contractFormatVersion',
    input.contract.formatVersion,
    lock.contractFormatVersion,
  );
  assertEqual('platform', input.contract.platform, lock.platform);
  assertEqual('sourceSha', input.contract.sourceSha, lock.sourceSha);
  assertEqual('trackingPlanId', input.contract.trackingPlan.id, lock.trackingPlanId);
  assertEqual('ruleCount', input.contract.ruleCount, lock.ruleCount);
  assertEqual('contractHash', input.contract.hash, lock.contractHash);
};
