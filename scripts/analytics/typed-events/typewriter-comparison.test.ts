import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import type { ContractRule, MobileContract } from './contract';
import {
  readTypewriterOutput,
  writeTypewriterFixture,
} from './typewriter-comparison';

const createContract = (): MobileContract => ({
  formatVersion: 1,
  generatedAt: '2026-09-25T00:00:00.000Z',
  hash: `sha256:${'a'.repeat(64)}`,
  platform: 'mobile',
  ruleCount: 2,
  rules: [],
  sourceSha: 'a'.repeat(40),
  trackingPlan: {
    id: 'tp_test',
    name: 'MetaMask Mobile',
    type: 'LIVE',
    updatedAt: '2026-09-25T00:00:00.000Z',
  },
});

const createRule = (version: number): ContractRule => ({
  key: 'Quick Buy Amount Selected',
  type: 'TRACK',
  version,
  jsonSchema: {
    type: 'object',
    properties: {},
  },
  deprecatedAt: null,
});

describe('Typewriter comparison fixture', () => {
  const roots: string[] = [];

  afterEach(() => {
    roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
  });

  it('writes a local React Native Typewriter fixture with both versions', () => {
    const root = mkdtempSync(join(tmpdir(), 'analytics-typewriter-'));
    roots.push(root);
    const paths = writeTypewriterFixture(
      createContract(),
      [createRule(1), createRule(2)],
      root,
    );

    expect(paths.configPath).toContain('typewriter.yml');
    expect(paths.generatedDirectory).toContain('/generated');
    expect(paths.planPath).toContain('/generated/plan.json');
    expect(readFileSync(paths.configPath, 'utf8')).toContain(
      'sdk: analytics-react-native',
    );
    expect(
      (JSON.parse(readFileSync(paths.planPath, 'utf8')) as { rules: unknown[] })
        .rules,
    ).toHaveLength(2);
  });

  it('reads TypeScript and TSX Typewriter output deterministically', () => {
    const root = mkdtempSync(join(tmpdir(), 'analytics-typewriter-'));
    roots.push(root);
    writeFileSync(join(root, 'z.ts'), 'export const z = true;');
    writeFileSync(join(root, 'a.tsx'), 'export const a = true;');

    const result = readTypewriterOutput(root);

    expect(result.files.map((filePath) => basename(filePath))).toEqual([
      'a.tsx',
      'z.ts',
    ]);
    expect(result.source).toBe(
      'export const a = true;\nexport const z = true;',
    );
  });
});
