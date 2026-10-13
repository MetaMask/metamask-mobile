import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | JsonObject;

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export interface ContractSummary {
  readonly slug: string;
  readonly trackingPlanId: string;
  readonly trackingPlanUpdatedAt: string | null;
  readonly ruleCount: number;
  readonly pageCount: number;
  readonly hash: string;
}

export interface ContractManifest {
  readonly formatVersion: number;
  readonly source: string;
  readonly sourceRepository: string;
  readonly sourceSha: string;
  readonly generatedAt: string;
  readonly contracts: {
    readonly mobile: ContractSummary;
  };
}

export interface TrackingPlanMetadata {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly updatedAt: string | null;
}

export interface ContractRule {
  readonly key: string;
  readonly type: string;
  readonly version: number;
  readonly jsonSchema: JsonObject;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly deprecatedAt?: string | null;
}

export interface MobileContract {
  readonly formatVersion: number;
  readonly platform: 'mobile';
  readonly sourceSha: string;
  readonly generatedAt: string;
  readonly trackingPlan: TrackingPlanMetadata;
  readonly ruleCount: number;
  readonly rules: readonly ContractRule[];
  readonly hash: string;
}

export interface VerifyMobileContractOptions {
  readonly manifestPath: string;
  readonly contractPath: string;
  readonly expectedAssetSha256?: string;
  readonly eventName?: string;
  readonly versions?: readonly number[];
}

export interface VerifiedMobileContract {
  readonly manifest: ContractManifest;
  readonly contract: MobileContract;
  readonly eventRules: readonly ContractRule[];
  readonly assetSha256: string;
}

const DEFAULT_EVENT_NAME = 'Quick Buy Amount Selected';
const DEFAULT_VERSIONS = [1, 2] as const;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;

const isJsonValue = (value: unknown): value is JsonValue => {
  if (value === null) {
    return true;
  }

  if (
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === 'object') {
    return Object.values(value).every(isJsonValue);
  }

  return false;
};

const isJsonObject = (value: unknown): value is JsonObject =>
  isJsonValue(value) &&
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value);

const readJsonObject = (filePath: string): JsonObject => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  } catch (error) {
    throw new Error(`Unable to parse JSON file '${filePath}': ${String(error)}`);
  }

  if (!isJsonObject(parsed)) {
    throw new Error(`Expected JSON object in '${filePath}'`);
  }

  return parsed;
};

const readObject = (
  value: JsonValue | undefined,
  path: string,
): JsonObject => {
  if (!isJsonObject(value)) {
    throw new Error(`Expected object at ${path}`);
  }

  return value;
};

const readString = (
  object: JsonObject,
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
  object: JsonObject,
  key: string,
  path: string,
): number => {
  const value = object[key];

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`Expected integer at ${path}.${key}`);
  }

  return value;
};

const readNullableString = (
  object: JsonObject,
  key: string,
  path: string,
): string | null => {
  const value = object[key];

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`Expected string or null at ${path}.${key}`);
  }

  return value;
};

const readOptionalNullableString = (
  object: JsonObject,
  key: string,
  path: string,
): string | null | undefined => {
  if (!(key in object)) {
    return undefined;
  }

  return readNullableString(object, key, path);
};

const readHash = (
  object: JsonObject,
  key: string,
  path: string,
): string => {
  const value = readString(object, key, path);

  if (!SHA256_PATTERN.test(value)) {
    throw new Error(`Expected SHA-256 digest at ${path}.${key}`);
  }

  return value;
};

const parseContractSummary = (
  value: JsonValue | undefined,
  path: string,
): ContractSummary => {
  const object = readObject(value, path);

  return {
    slug: readString(object, 'slug', path),
    trackingPlanId: readString(object, 'trackingPlanId', path),
    trackingPlanUpdatedAt: readNullableString(
      object,
      'trackingPlanUpdatedAt',
      path,
    ),
    ruleCount: readInteger(object, 'ruleCount', path),
    pageCount: readInteger(object, 'pageCount', path),
    hash: readHash(object, 'hash', path),
  };
};

const parseManifest = (value: JsonObject): ContractManifest => {
  const contracts = readObject(value.contracts, 'manifest.contracts');

  return {
    formatVersion: readInteger(value, 'formatVersion', 'manifest'),
    source: readString(value, 'source', 'manifest'),
    sourceRepository: readString(
      value,
      'sourceRepository',
      'manifest',
    ),
    sourceSha: readString(value, 'sourceSha', 'manifest'),
    generatedAt: readString(value, 'generatedAt', 'manifest'),
    contracts: {
      mobile: parseContractSummary(
        contracts.mobile,
        'manifest.contracts.mobile',
      ),
    },
  };
};

const parseRule = (value: JsonValue, index: number): ContractRule => {
  const path = `contract.rules[${index}]`;
  const object = readObject(value, path);

  return {
    key: readString(object, 'key', path),
    type: readString(object, 'type', path),
    version: readInteger(object, 'version', path),
    jsonSchema: readObject(object.jsonSchema, `${path}.jsonSchema`),
    createdAt: readOptionalNullableString(object, 'createdAt', path),
    updatedAt: readOptionalNullableString(object, 'updatedAt', path),
    deprecatedAt: readOptionalNullableString(object, 'deprecatedAt', path),
  };
};

const parseContract = (value: JsonObject): MobileContract => {
  const platform = readString(value, 'platform', 'contract');

  if (platform !== 'mobile') {
    throw new Error(`Expected contract.platform to be 'mobile', got '${platform}'`);
  }

  const rulesValue = value.rules;

  if (!Array.isArray(rulesValue)) {
    throw new Error('Expected contract.rules to be an array');
  }

  const trackingPlan = readObject(
    value.trackingPlan,
    'contract.trackingPlan',
  );

  return {
    formatVersion: readInteger(value, 'formatVersion', 'contract'),
    platform,
    sourceSha: readString(value, 'sourceSha', 'contract'),
    generatedAt: readString(value, 'generatedAt', 'contract'),
    trackingPlan: {
      id: readString(trackingPlan, 'id', 'contract.trackingPlan'),
      name: readString(trackingPlan, 'name', 'contract.trackingPlan'),
      type: readString(trackingPlan, 'type', 'contract.trackingPlan'),
      updatedAt: readNullableString(
        trackingPlan,
        'updatedAt',
        'contract.trackingPlan',
      ),
    },
    ruleCount: readInteger(value, 'ruleCount', 'contract'),
    rules: rulesValue.map(parseRule),
    hash: readHash(value, 'hash', 'contract'),
  };
};

const sortJsonDeep = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(sortJsonDeep);
  }

  if (isJsonObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortJsonDeep(value[key])]),
    );
  }

  return value;
};

const stableStringify = (value: JsonValue): string =>
  JSON.stringify(sortJsonDeep(value));

const sha256 = (value: string | Buffer): string =>
  `sha256:${createHash('sha256').update(value).digest('hex')}`;

/**
 * Calculate the SHA-256 digest for a downloaded contract asset.
 *
 * @param filePath - Path to the downloaded contract asset.
 * @returns The digest in the release manifest format.
 */
export const sha256File = (filePath: string): string =>
  sha256(readFileSync(filePath));

/**
 * Recompute the semantic hash used by the contract release producer.
 *
 * @param contract - Contract data without relying on its stored hash.
 * @returns The recomputed semantic hash.
 */
export const computeSemanticContractHash = (
  contract: Pick<
    MobileContract,
    'formatVersion' | 'platform' | 'trackingPlan' | 'rules'
  >,
): string =>
  sha256(
    stableStringify({
      formatVersion: contract.formatVersion,
      platform: contract.platform,
      trackingPlanId: contract.trackingPlan.id,
      rules: contract.rules.map((rule) => ({
        key: rule.key,
        type: rule.type,
        version: rule.version,
        jsonSchema: rule.jsonSchema,
        deprecated: Boolean(rule.deprecatedAt),
      })),
    }),
  );

const selectEventRules = (
  contract: MobileContract,
  eventName: string,
  versions: readonly number[],
): readonly ContractRule[] => {
  const requestedVersions = [...new Set(versions)];

  if (requestedVersions.length === 0) {
    throw new Error('At least one event version is required');
  }

  return requestedVersions.map((version) => {
    const matches = contract.rules.filter(
      (rule) =>
        rule.key === eventName &&
        rule.type === 'TRACK' &&
        rule.version === version,
    );

    if (matches.length === 0) {
      throw new Error(
        `Event '${eventName}' version ${version} was not found in the Mobile contract`,
      );
    }

    if (matches.length > 1) {
      throw new Error(
        `Event '${eventName}' version ${version} appears more than once in the Mobile contract`,
      );
    }

    const [rule] = matches;

    if (rule.deprecatedAt) {
      throw new Error(
        `Event '${eventName}' version ${version} is deprecated in the Mobile contract`,
      );
    }

    return rule;
  });
};

/**
 * Verify a deployed Mobile contract and select required event versions.
 *
 * @param options - Paths, optional asset digest, and event selection criteria.
 * @returns Verified release metadata and the selected event rules.
 */
export const verifyMobileContract = ({
  manifestPath,
  contractPath,
  expectedAssetSha256,
  eventName = DEFAULT_EVENT_NAME,
  versions = DEFAULT_VERSIONS,
}: VerifyMobileContractOptions): VerifiedMobileContract => {
  const manifest = parseManifest(readJsonObject(manifestPath));
  const contract = parseContract(readJsonObject(contractPath));
  const mobileSummary = manifest.contracts.mobile;
  const assetSha256 = sha256File(contractPath);

  if (manifest.formatVersion !== contract.formatVersion) {
    throw new Error(
      `Manifest and contract format versions differ: ${manifest.formatVersion} vs ${contract.formatVersion}`,
    );
  }

  if (manifest.source !== 'segment-public-api') {
    throw new Error(
      `Expected manifest.source to be 'segment-public-api', got '${manifest.source}'`,
    );
  }

  if (manifest.sourceRepository !== 'Consensys/segment-schema') {
    throw new Error(
      `Unexpected manifest.sourceRepository '${manifest.sourceRepository}'`,
    );
  }

  if (contract.sourceSha !== manifest.sourceSha) {
    throw new Error(
      `Manifest sourceSha '${manifest.sourceSha}' does not match contract sourceSha '${contract.sourceSha}'`,
    );
  }

  if (contract.ruleCount !== contract.rules.length) {
    throw new Error(
      `Contract ruleCount ${contract.ruleCount} does not match ${contract.rules.length} rules`,
    );
  }

  if (mobileSummary.ruleCount !== contract.ruleCount) {
    throw new Error(
      `Manifest Mobile ruleCount ${mobileSummary.ruleCount} does not match contract ruleCount ${contract.ruleCount}`,
    );
  }

  if (mobileSummary.trackingPlanId !== contract.trackingPlan.id) {
    throw new Error(
      `Manifest trackingPlanId '${mobileSummary.trackingPlanId}' does not match contract trackingPlan.id '${contract.trackingPlan.id}'`,
    );
  }

  if (mobileSummary.hash !== contract.hash) {
    throw new Error(
      `Manifest Mobile hash '${mobileSummary.hash}' does not match contract hash '${contract.hash}'`,
    );
  }

  const computedSemanticHash = computeSemanticContractHash(contract);

  if (computedSemanticHash !== contract.hash) {
    throw new Error(
      `Contract semantic hash '${contract.hash}' does not match computed hash '${computedSemanticHash}'`,
    );
  }

  if (expectedAssetSha256 !== undefined) {
    if (!SHA256_PATTERN.test(expectedAssetSha256)) {
      throw new Error(
        `Expected asset digest '${expectedAssetSha256}' is not a SHA-256 digest`,
      );
    }

    if (expectedAssetSha256 !== assetSha256) {
      throw new Error(
        `Contract asset digest '${assetSha256}' does not match expected digest '${expectedAssetSha256}'`,
      );
    }
  }

  return {
    manifest,
    contract,
    eventRules: selectEventRules(contract, eventName, versions),
    assetSha256,
  };
};
