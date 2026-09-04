import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

import {
  evaluateExtractTagsFromChangedSpecs,
  evaluateExtractTagsFromImportGraph,
  TagCatalog,
} from './hard-rule-extract';

const SPEC_REL = 'tests/smoke-appium/accounts.spec.ts';
const SPEC_IMPORT = `import { SmokeAccounts } from '../../tags.js';
`;

const e2eCatalog: TagCatalog = {
  e2e: [{ id: 'SmokeAccounts', description: 'Accounts flows' }],
};

function extractRule(extras: Record<string, unknown> = {}) {
  return {
    name: 'spec-tags',
    description: 'tags from changed specs',
    trigger: {
      type: 'extractTagsFromChangedSpecs',
      specPrefixes: ['tests/'],
      catalogGroup: 'e2e',
      ...extras,
    },
  };
}

function writeSpecTree(baseDir: string, specSource: string): void {
  mkdirSync(join(baseDir, 'tests', 'smoke-appium'), { recursive: true });
  writeFileSync(join(baseDir, SPEC_REL), specSource);
  writeFileSync(join(baseDir, 'tags.js'), '');
}

describe('evaluateExtractTagsFromChangedSpecs', () => {
  const temps: string[] = [];

  after(() => {
    for (const dir of temps) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeTemp(): string {
    const dir = mkdtempSync(join(tmpdir(), 'hard-rule-extract-'));
    temps.push(dir);
    return dir;
  }

  function run(
    changedFiles: string[],
    rule: ReturnType<typeof extractRule>,
    catalog: TagCatalog,
    baseDir: string,
  ) {
    return evaluateExtractTagsFromChangedSpecs(
      rule,
      changedFiles,
      { baseDir, baseBranch: 'origin/main' },
      catalog,
    );
  }

  it('selects catalog tags from a changed spec import', () => {
    const baseDir = makeTemp();
    writeSpecTree(baseDir, SPEC_IMPORT);
    const out = run([SPEC_REL], extractRule(), e2eCatalog, baseDir);
    assert.ok(out);
    assert.deepEqual(out.selectedTags, ['SmokeAccounts']);
  });

  it('falls through when remaining changes are outside the gate prefixes', () => {
    const baseDir = makeTemp();
    writeSpecTree(baseDir, SPEC_IMPORT);
    const out = run(
      [SPEC_REL, 'app/foo.ts'],
      extractRule({
        onlyIfRemainingChangesMatch: { prefixes: ['tests/'] },
      }),
      e2eCatalog,
      baseDir,
    );
    assert.equal(out, null);
  });

  it('fires when remaining docs changes match ignorablePathRegexes', () => {
    const baseDir = makeTemp();
    writeSpecTree(baseDir, SPEC_IMPORT);
    const out = run(
      [SPEC_REL, 'docs/readme.md'],
      extractRule({
        onlyIfRemainingChangesMatch: {
          prefixes: ['tests/'],
          ignorablePathRegexes: ['^docs/'],
        },
      }),
      e2eCatalog,
      baseDir,
    );
    assert.ok(out);
    assert.deepEqual(out.selectedTags, ['SmokeAccounts']);
  });

  it('falls through when the catalog group does not include the extracted tag', () => {
    const baseDir = makeTemp();
    writeSpecTree(baseDir, SPEC_IMPORT);
    const out = run(
      [SPEC_REL],
      extractRule(),
      { e2e: [{ id: 'SmokeOther', description: 'other' }] },
      baseDir,
    );
    assert.equal(out, null);
  });

  it('falls through when the spec has no tags import', () => {
    const baseDir = makeTemp();
    writeSpecTree(baseDir, 'export const spec = true;\n');
    const out = run([SPEC_REL], extractRule(), e2eCatalog, baseDir);
    assert.equal(out, null);
  });

  it('does not throw when tagsImportRegex is malformed', () => {
    const baseDir = makeTemp();
    writeSpecTree(baseDir, SPEC_IMPORT);
    assert.doesNotThrow(() => {
      const out = run(
        [SPEC_REL],
        extractRule({ tagsImportRegex: '[' }),
        e2eCatalog,
        baseDir,
      );
      assert.equal(out, null);
    });
  });
});

const TOKEN_SPEC = 'tests/smoke-appium/tokens.spec.ts';
const TOKEN_PAGE = 'tests/page-objects/TokenPage.ts';
const TOKEN_SELECTORS = 'tests/page-objects/TokenSelectors.ts';
const TOKEN_SPEC_SOURCE = `import { TokenPage } from '../../page-objects/TokenPage';
import { SmokeTokens } from '../../tags.js';
`;

const tokensCatalog: TagCatalog = {
  e2e: [{ id: 'SmokeTokens', description: 'Token flows' }],
};

function importGraphRule(extras: Record<string, unknown> = {}) {
  return {
    name: 'import-graph-tags',
    description: 'tags from import graph',
    trigger: {
      type: 'extractTagsFromImportGraph',
      sourcePrefixes: ['tests/page-objects/'],
      intermediatePrefixes: ['tests/page-objects/'],
      specPrefixes: ['tests/smoke-appium/'],
      catalogGroup: 'e2e',
      ...extras,
    },
  };
}

function writeDirectImportTree(baseDir: string): void {
  mkdirSync(join(baseDir, 'tests', 'page-objects'), { recursive: true });
  mkdirSync(join(baseDir, 'tests', 'smoke-appium'), { recursive: true });
  writeFileSync(join(baseDir, TOKEN_PAGE), 'export const TokenPage = true;\n');
  writeFileSync(join(baseDir, TOKEN_SPEC), TOKEN_SPEC_SOURCE);
  writeFileSync(join(baseDir, 'tags.js'), '');
}

function writeOneHopTree(baseDir: string): void {
  mkdirSync(join(baseDir, 'tests', 'page-objects'), { recursive: true });
  mkdirSync(join(baseDir, 'tests', 'smoke-appium'), { recursive: true });
  writeFileSync(
    join(baseDir, TOKEN_SELECTORS),
    'export const TokenSelectors = true;\n',
  );
  writeFileSync(
    join(baseDir, TOKEN_PAGE),
    `import { TokenSelectors } from './TokenSelectors';
export const TokenPage = true;
`,
  );
  writeFileSync(join(baseDir, TOKEN_SPEC), TOKEN_SPEC_SOURCE);
  writeFileSync(join(baseDir, 'tags.js'), '');
}

describe('evaluateExtractTagsFromImportGraph', () => {
  const temps: string[] = [];

  after(() => {
    for (const dir of temps) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeTemp(): string {
    const dir = mkdtempSync(join(tmpdir(), 'hard-rule-import-graph-'));
    temps.push(dir);
    return dir;
  }

  function run(
    changedFiles: string[],
    rule: ReturnType<typeof importGraphRule>,
    catalog: TagCatalog,
    baseDir: string,
  ) {
    return evaluateExtractTagsFromImportGraph(
      rule,
      changedFiles,
      { baseDir, baseBranch: 'origin/main' },
      catalog,
    );
  }

  it('selects catalog tags from a spec that directly imports a changed page-object', () => {
    const baseDir = makeTemp();
    writeDirectImportTree(baseDir);
    const out = run([TOKEN_PAGE], importGraphRule(), tokensCatalog, baseDir);
    assert.ok(out);
    assert.deepEqual(out.selectedTags, ['SmokeTokens']);
  });

  it('selects catalog tags one hop through a page-object (default hop 1)', () => {
    const baseDir = makeTemp();
    writeOneHopTree(baseDir);
    const out = run(
      [TOKEN_SELECTORS],
      importGraphRule(),
      tokensCatalog,
      baseDir,
    );
    assert.ok(out);
    assert.deepEqual(out.selectedTags, ['SmokeTokens']);
  });

  it('does not follow the one-hop page-object path when hop is 0', () => {
    const baseDir = makeTemp();
    writeOneHopTree(baseDir);
    const out = run(
      [TOKEN_SELECTORS],
      importGraphRule({ hop: 0 }),
      tokensCatalog,
      baseDir,
    );
    assert.equal(out, null);
  });

  it('falls through when remaining changes are outside the gate prefixes', () => {
    const baseDir = makeTemp();
    writeDirectImportTree(baseDir);
    const out = run(
      [TOKEN_PAGE, 'app/foo.ts'],
      importGraphRule({
        onlyIfRemainingChangesMatch: { prefixes: ['tests/'] },
      }),
      tokensCatalog,
      baseDir,
    );
    assert.equal(out, null);
  });

  it('does not treat a longer basename as an import of a shorter stem', () => {
    const baseDir = makeTemp();
    mkdirSync(join(baseDir, 'tests', 'page-objects'), { recursive: true });
    mkdirSync(join(baseDir, 'tests', 'smoke-appium'), { recursive: true });
    writeFileSync(
      join(baseDir, 'tests/page-objects/Token.ts'),
      'export const Token = true;\n',
    );
    writeFileSync(
      join(baseDir, TOKEN_SPEC),
      `import { Tokens } from '../../page-objects/Tokens';
import { SmokeTokens } from '../../tags.js';
`,
    );
    const out = run(
      ['tests/page-objects/Token.ts'],
      importGraphRule(),
      tokensCatalog,
      baseDir,
    );
    assert.equal(out, null);
  });

  it('falls through when grep finds no importers', () => {
    const baseDir = makeTemp();
    mkdirSync(join(baseDir, 'tests', 'page-objects'), { recursive: true });
    mkdirSync(join(baseDir, 'tests', 'smoke-appium'), { recursive: true });
    writeFileSync(
      join(baseDir, TOKEN_PAGE),
      'export const TokenPage = true;\n',
    );
    writeFileSync(
      join(baseDir, TOKEN_SPEC),
      `import { SmokeTokens } from '../../tags.js';
`,
    );
    const out = run([TOKEN_PAGE], importGraphRule(), tokensCatalog, baseDir);
    assert.equal(out, null);
  });
});
