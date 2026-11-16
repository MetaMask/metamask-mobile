/**
 * Proves the Predict boundary fence (PRED-1399) holds in every ESLint
 * override, that its burn-down allowlist stays empty (PRED-1394), and that
 * every composition file is documented.
 *
 * ESLint replaces `import-x/no-restricted-paths` per override instead of
 * merging it, so a zone declared in one override is silently dropped for
 * files that a later override matches (Views files, util/number burn-down
 * files). These tests resolve the real `.eslintrc.js` for fixture files in
 * each override and lint fixture imports with the rule config ESLint would
 * use there.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Linter } from 'eslint';

/* eslint-disable @typescript-eslint/no-require-imports, import-x/no-commonjs */
const tsParser = require('@typescript-eslint/parser');
const importX = require('eslint-plugin-import-x');
const eslintConfig = require('../.eslintrc.js');
const {
  PREDICT_DIR,
  PREDICT_NEXT_DIR,
  predictBoundaryZones,
  predictCompositionFiles,
  predictCompositionGroups,
  predictImportBurndownFiles,
} = require('./eslint-predict-boundary-zones');
/* eslint-enable @typescript-eslint/no-require-imports, import-x/no-commonjs */

const RULE = 'import-x/no-restricted-paths';
const REPO_ROOT = path.join(__dirname, '..');

type RuleEntry = [Linter.RuleSeverity, { zones: Zone[] }];

interface Zone {
  target: string | string[];
  from: string | string[];
  except?: string[];
  message?: string;
}

interface Override {
  files: string | string[];
  rules?: Record<string, unknown>;
}

const linter = new Linter({ cwd: REPO_ROOT });

// One fixture per override that sets the rule. `override` names the zones
// that tell the resolved overrides apart, so the case fails if the file
// stops landing where it claims.
const OVERRIDE_CASES = [
  {
    name: 'non-Views file (default import fence)',
    file: 'app/components/UI/Bridge/PredictBoundaryFixture.ts',
    override: { utilNumber: true, routeIsolation: false },
  },
  {
    name: 'Views file (route-isolation override)',
    file: 'app/components/Views/Wallet/PredictBoundaryFixture.tsx',
    override: { utilNumber: true, routeIsolation: true },
  },
  {
    // A Views file on the util/number burn-down list.
    name: 'Views util/number burn-down file (burn-down override)',
    file: 'app/components/Views/NetworksManagement/NetworkDetailsView/hooks/useNetworkValidation.ts',
    override: { utilNumber: false, routeIsolation: true },
  },
  {
    // A non-Views file on the util/number burn-down list.
    name: 'non-Views util/number burn-down file (burn-down override)',
    file: 'app/components/UI/Bridge/utils/exchange-rates.ts',
    override: { utilNumber: false, routeIsolation: true },
  },
  {
    name: 'util/number file (haptics and util/number override)',
    file: 'app/util/number/PredictBoundaryFixture.ts',
    override: { utilNumber: false, routeIsolation: false },
  },
  {
    name: 'util/haptics file (haptics and util/number override)',
    file: 'app/util/haptics/PredictBoundaryFixture.ts',
    override: { utilNumber: false, routeIsolation: false },
  },
];

const PASSING_IMPORT_CASES: [string, string][] = [
  [
    'composition Views file',
    'app/components/Views/confirmations/components/modals/pay-with-modal/pay-with-modal.tsx',
  ],
  ['composition file', 'app/core/Engine/types.ts'],
  ['composition file', 'app/components/Nav/Main/MainNavigator.tsx'],
  ['legacy Predict file', 'app/components/UI/Predict/index.ts'],
  ['PredictNext file', 'app/components/UI/PredictNext/activity/index.ts'],
];

/**
 * Jest's vm cannot dynamically import eslint.config.mjs. Ask a plain Node
 * process for the rule ESLint would use for these files.
 */
const loadResolvedRuleConfigs = (
  files: string[],
): Record<string, RuleEntry | null> => {
  const unique = [...new Set(files)];
  const outPath = path.join(
    os.tmpdir(),
    `predict-boundary-eslint-${process.pid}.json`,
  );
  const script = `
const { ESLint } = require('eslint');
const fs = require('node:fs');
const path = require('node:path');
const files = ${JSON.stringify(unique)};
const ruleId = ${JSON.stringify(RULE)};
const cwd = ${JSON.stringify(REPO_ROOT)};
const outPath = ${JSON.stringify(outPath)};
const eslint = new ESLint({ cwd });
(async () => {
  const out = {};
  for (const file of files) {
    const config = await eslint.calculateConfigForFile(path.join(cwd, file));
    out[file] = config.rules?.[ruleId] ?? null;
  }
  fs.writeFileSync(outPath, JSON.stringify(out));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: '' },
  });
  if (result.status !== 0) {
    throw new Error(
      `Failed to resolve ESLint config (status ${result.status}).\n${result.stderr}`,
    );
  }
  const parsed = JSON.parse(fs.readFileSync(outPath, 'utf8')) as Record<
    string,
    RuleEntry | null
  >;
  fs.unlinkSync(outPath);
  return parsed;
};

const resolvedRuleConfigs = loadResolvedRuleConfigs([
  ...OVERRIDE_CASES.map((item) => item.file),
  ...PASSING_IMPORT_CASES.map(([, file]) => file),
  ...predictImportBurndownFiles,
  ...predictCompositionFiles,
]);

const resolveRuleConfig = async (
  file: string,
): Promise<{ rule: RuleEntry | undefined; settings: Record<string, unknown> }> => {
  if (!Object.prototype.hasOwnProperty.call(resolvedRuleConfigs, file)) {
    throw new Error(`No ESLint config was resolved for ${file}`);
  }
  return {
    rule: resolvedRuleConfigs[file] ?? undefined,
    // The calculated settings contain resolver objects. JSON keeps
    // interfaceVersion and drops resolve(), so use the config object itself.
    settings: eslintConfig.settings as Record<string, unknown>,
  };
};

/**
 * Flat config has no `defineParser` or `defineRule`. The parser and plugin
 * belong in the config passed to `verify`.
 */
const lintSource = (
  code: string,
  filename: string,
  rule: RuleEntry,
  settings: Record<string, unknown>,
): Linter.LintMessage[] =>
  linter.verify(
    code,
    {
      // A flat config matches a .ts/.tsx file only when some block names that
      // extension. The default blocks match JavaScript only.
      files: ['**/*.{js,jsx,ts,tsx}'],
      languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      plugins: {
        'import-x': importX,
      },
      settings,
      rules: { [RULE]: rule },
    },
    { filename },
  );

const lintImport = (
  file: string,
  importedFile: string,
  rule: RuleEntry,
  settings: Record<string, unknown>,
): { ruleId: string | null; message: string }[] => {
  const specifier = path
    .relative(path.dirname(path.join(REPO_ROOT, file)), importedFile)
    .replace(/\.tsx?$/, '');
  return lintSource(
    `import * as imported from './${specifier}';\nexport { imported };\n`,
    path.join(REPO_ROOT, file),
    rule,
    settings,
  ).map(({ ruleId, message }) => ({ ruleId, message }));
};

const LEGACY_PREDICT = path.join(REPO_ROOT, PREDICT_DIR, 'index.ts');
const PREDICT_NEXT_INTERNAL = path.join(
  REPO_ROOT,
  PREDICT_NEXT_DIR,
  'activity/index.ts',
);
const PREDICT_NEXT_ENTRY = path.join(REPO_ROOT, PREDICT_NEXT_DIR, 'index.ts');

const isUtilNumberZone = (zone: Zone): boolean =>
  zone.from === 'app/util/number/index.js';
const isRouteIsolationZone = (zone: Zone): boolean =>
  zone.from === 'app/components/Views';

describe('Predict boundary fence', () => {
  it('is carried by every override that sets import-x/no-restricted-paths', () => {
    const overridesSettingRule = (eslintConfig.overrides as Override[]).filter(
      (override) => override.rules?.[RULE],
    );

    expect(overridesSettingRule.length).toBeGreaterThanOrEqual(4);
    for (const override of overridesSettingRule) {
      const [, { zones }] = override.rules?.[RULE] as RuleEntry;
      expect({ files: override.files, zones }).toEqual({
        files: override.files,
        zones: expect.arrayContaining(predictBoundaryZones),
      });
    }
  });

  describe.each(OVERRIDE_CASES)('in a $name', ({ file, override }) => {
    it('resolves to the expected override', async () => {
      const { rule } = await resolveRuleConfig(file);

      const zones = rule?.[1].zones ?? [];
      expect({
        utilNumber: zones.some(isUtilNumberZone),
        routeIsolation: zones.some(isRouteIsolationZone),
      }).toEqual(override);
    });

    it('fails a new legacy Predict import', async () => {
      const { rule, settings } = await resolveRuleConfig(file);

      const messages = lintImport(
        file,
        LEGACY_PREDICT,
        rule as RuleEntry,
        settings as Record<string, unknown>,
      );

      expect(messages).toEqual([
        {
          ruleId: RULE,
          message: expect.stringContaining(
            'Legacy app/components/UI/Predict is private.',
          ),
        },
      ]);
    });

    it('fails a new PredictNext internal import', async () => {
      const { rule, settings } = await resolveRuleConfig(file);

      const messages = lintImport(
        file,
        PREDICT_NEXT_INTERNAL,
        rule as RuleEntry,
        settings as Record<string, unknown>,
      );

      expect(messages).toEqual([
        {
          ruleId: RULE,
          message: expect.stringContaining(
            'PredictNext internals are private.',
          ),
        },
      ]);
    });

    it('passes the PredictNext entry point', async () => {
      const { rule, settings } = await resolveRuleConfig(file);

      const messages = lintImport(
        file,
        PREDICT_NEXT_ENTRY,
        rule as RuleEntry,
        settings as Record<string, unknown>,
      );

      expect(messages).toEqual([]);
    });
  });

  it.each(PASSING_IMPORT_CASES)(
    'passes legacy and internal imports in a %s (%s)',
    async (_, file) => {
      const { rule, settings } = await resolveRuleConfig(file);

      const messages = [LEGACY_PREDICT, PREDICT_NEXT_INTERNAL].flatMap(
        (imported) =>
          lintImport(
            file,
            imported,
            rule as RuleEntry,
            settings as Record<string, unknown>,
          ),
      );

      expect(messages).toEqual([]);
    },
  );
});

describe('Predict boundary allowlists', () => {
  it('keeps the burn-down list empty (PRED-1394 closed it)', () => {
    // A file here means code outside Predict imports Predict internals again.
    // Import from app/components/UI/PredictNext instead.
    expect(predictImportBurndownFiles).toEqual([]);
  });

  it('names every composition file in exactly one documented group', () => {
    const doc = fs.readFileSync(
      path.join(
        REPO_ROOT,
        PREDICT_NEXT_DIR,
        'docs/composition-allowlist.md',
      ),
      'utf8',
    );
    const grouped = Object.values(
      predictCompositionGroups as Record<string, string[]>,
    ).flat();

    expect(new Set(grouped).size).toBe(grouped.length);
    expect(predictCompositionFiles).toEqual(grouped);
    // The doc is the deletion checklist's source of truth: every group and
    // every non-test file in it must be named there.
    for (const group of Object.keys(predictCompositionGroups)) {
      expect({ group, documented: doc.includes(`\`${group}\``) }).toEqual({
        group,
        documented: true,
      });
    }
    for (const file of grouped.filter(
      (entry) => !/\.test\.tsx?$/.test(entry),
    )) {
      expect({ file, documented: doc.includes(file) }).toEqual({
        file,
        documented: true,
      });
    }
  });

  // An allowlisted file that no longer imports Predict internals must leave
  // its list, so a migration PR cannot finish with its files still exempt.
  it.each([
    ...predictCompositionFiles.map((file: string) => ['composition', file]),
  ])('%s entry %s still imports Predict internals', async (_, file) => {
    const absolute = path.join(REPO_ROOT, file);
    expect(fs.existsSync(absolute)).toBe(true);
    const { settings } = await resolveRuleConfig(file);
    const zonesWithoutAllowlist = predictBoundaryZones.map((zone: Zone) => ({
      ...zone,
      target: file,
    }));

    const messages = lintSource(
      fs.readFileSync(absolute, 'utf8'),
      absolute,
      ['error', { zones: zonesWithoutAllowlist }],
      settings as Record<string, unknown>,
    );

    expect(messages.filter(({ ruleId }) => ruleId === RULE)).not.toEqual([]);
  });
});
