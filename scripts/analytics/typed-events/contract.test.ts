import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  computeSemanticContractHash,
  sha256File,
  verifyMobileContract,
  type ContractManifest,
  type ContractRule,
  type MobileContract,
} from './contract';

const EVENT_NAME = 'Quick Buy Amount Selected';
const SOURCE_SHA = '67390efdfde300fec50596c149eb02e46f91c5eb';
const TRACKING_PLAN_ID = 'tp_mobile_test';

interface FixtureOptions {
  readonly versions?: readonly number[];
  readonly deprecatedVersions?: readonly number[];
}

interface ContractFixture {
  readonly root: string;
  readonly manifestPath: string;
  readonly contractPath: string;
  readonly assetSha256: string;
  readonly manifest: ContractManifest;
  readonly contract: MobileContract;
}

const createRule = (
  version: number,
  deprecatedAt: string | null,
): ContractRule => ({
  key: EVENT_NAME,
  type: 'TRACK',
  version,
  jsonSchema: {
    type: 'object',
    properties: {
      properties: {
        type: 'object',
        properties: {
          amount_usd: { type: ['number'] },
          amount_selection_method: {
            type: ['string'],
            enum: ['preset', 'custom_input'],
          },
          source: { type: ['string'] },
        },
        required: ['amount_usd', 'amount_selection_method', 'source'],
      },
    },
  },
  createdAt: null,
  updatedAt: null,
  deprecatedAt,
});

const createFixture = ({
  versions = [1, 2],
  deprecatedVersions = [],
}: FixtureOptions = {}): ContractFixture => {
  const root = mkdtempSync(join(tmpdir(), 'typed-analytics-contract-'));
  const manifestPath = join(root, 'manifest.json');
  const contractPath = join(root, 'metamask-mobile.json');
  const rules = versions.map((version) =>
    createRule(
      version,
      deprecatedVersions.includes(version)
        ? '2026-09-25T00:00:00.000Z'
        : null,
    ),
  );
  const contractWithoutHash = {
    formatVersion: 1,
    platform: 'mobile' as const,
    sourceSha: SOURCE_SHA,
    generatedAt: '2026-09-25T00:00:00.000Z',
    trackingPlan: {
      id: TRACKING_PLAN_ID,
      name: 'MetaMask Mobile',
      type: 'LIVE',
      updatedAt: '2026-09-25T00:00:00.000Z',
    },
    ruleCount: rules.length,
    rules,
  };
  const contract: MobileContract = {
    ...contractWithoutHash,
    hash: computeSemanticContractHash(contractWithoutHash),
  };
  const manifest: ContractManifest = {
    formatVersion: 1,
    source: 'segment-public-api',
    sourceRepository: 'Consensys/segment-schema',
    sourceSha: SOURCE_SHA,
    generatedAt: '2026-09-25T00:00:00.000Z',
    contracts: {
      mobile: {
        slug: 'metamask-mobile',
        trackingPlanId: TRACKING_PLAN_ID,
        trackingPlanUpdatedAt: '2026-09-25T00:00:00.000Z',
        ruleCount: rules.length,
        pageCount: 1,
        hash: contract.hash,
      },
    },
  };

  writeFileSync(contractPath, JSON.stringify(contract));
  writeFileSync(manifestPath, JSON.stringify(manifest));

  return {
    root,
    manifestPath,
    contractPath,
    assetSha256: sha256File(contractPath),
    manifest,
    contract,
  };
};

const cleanupFixture = (fixture: ContractFixture): void => {
  rmSync(fixture.root, { recursive: true, force: true });
};

describe('verifyMobileContract', () => {
  const fixtures: ContractFixture[] = [];

  afterEach(() => {
    fixtures.splice(0).forEach(cleanupFixture);
  });

  it('returns both requested Quick Buy versions for a verified Mobile contract', () => {
    const fixture = createFixture();
    fixtures.push(fixture);

    const result = verifyMobileContract({
      manifestPath: fixture.manifestPath,
      contractPath: fixture.contractPath,
      expectedAssetSha256: fixture.assetSha256,
    });

    expect(result.eventRules.map((rule) => rule.version)).toEqual([1, 2]);
    expect(result.assetSha256).toBe(fixture.assetSha256);
  });

  it('rejects a manifest hash that differs from the contract', () => {
    const fixture = createFixture();
    fixtures.push(fixture);
    const mismatchedManifest: ContractManifest = {
      ...fixture.manifest,
      contracts: {
        mobile: {
          ...fixture.manifest.contracts.mobile,
          hash: `sha256:${'0'.repeat(64)}`,
        },
      },
    };

    writeFileSync(fixture.manifestPath, JSON.stringify(mismatchedManifest));

    expect(() =>
      verifyMobileContract({
        manifestPath: fixture.manifestPath,
        contractPath: fixture.contractPath,
      }),
    ).toThrow('does not match contract hash');
  });

  it('rejects semantic changes without a regenerated contract hash', () => {
    const fixture = createFixture();
    fixtures.push(fixture);
    const changedContract: MobileContract = {
      ...fixture.contract,
      rules: fixture.contract.rules.map((rule, index) =>
        index === 0 ? { ...rule, key: 'Different Event' } : rule,
      ),
    };

    writeFileSync(fixture.contractPath, JSON.stringify(changedContract));

    expect(() =>
      verifyMobileContract({
        manifestPath: fixture.manifestPath,
        contractPath: fixture.contractPath,
      }),
    ).toThrow('does not match computed hash');
  });

  it('rejects a missing requested event version', () => {
    const fixture = createFixture({ versions: [1] });
    fixtures.push(fixture);

    expect(() =>
      verifyMobileContract({
        manifestPath: fixture.manifestPath,
        contractPath: fixture.contractPath,
      }),
    ).toThrow('version 2 was not found');
  });

  it('rejects a deprecated requested event version', () => {
    const fixture = createFixture({ deprecatedVersions: [2] });
    fixtures.push(fixture);

    expect(() =>
      verifyMobileContract({
        manifestPath: fixture.manifestPath,
        contractPath: fixture.contractPath,
      }),
    ).toThrow('version 2 is deprecated');
  });

  it('rejects an asset digest mismatch', () => {
    const fixture = createFixture();
    fixtures.push(fixture);

    expect(() =>
      verifyMobileContract({
        manifestPath: fixture.manifestPath,
        contractPath: fixture.contractPath,
        expectedAssetSha256: `sha256:${'0'.repeat(64)}`,
      }),
    ).toThrow('does not match expected digest');
  });
});
