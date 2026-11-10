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
import fs from 'node:fs';
import path from 'node:path';
import { ESLint, Linter } from 'eslint';

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

type RuleEntry = [Linter.RuleLevel, { zones: Zone[] }];

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

const eslint = new ESLint({ cwd: REPO_ROOT });

const linter = new Linter({ cwd: REPO_ROOT });
linter.defineParser('typescript', tsParser);
linter.defineRule(RULE, importX.rules['no-restricted-paths']);

const resolveRuleConfig = async (file: string) => {
  const config = await eslint.calculateConfigForFile(file);
  return {
    rule: config.rules?.[RULE] as RuleEntry | undefined,
    settings: config.settings,
  };
};

const lintImport = (
  file: string,
  importedFile: string,
  rule: RuleEntry,
  settings: Record<string, unknown>,
) => {
  const specifier = path
    .relative(path.dirname(path.join(REPO_ROOT, file)), importedFile)
    .replace(/\.tsx?$/, '');
  return linter
    .verify(
      `import * as imported from './${specifier}';\nexport { imported };\n`,
      {
        parser: 'typescript',
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
        settings,
        rules: { [RULE]: rule },
      },
      { filename: path.join(REPO_ROOT, file) },
    )
    .map(({ ruleId, message }) => ({ ruleId, message }));
};

const LEGACY_PREDICT = path.join(REPO_ROOT, PREDICT_DIR, 'index.ts');
const PREDICT_NEXT_INTERNAL = path.join(
  REPO_ROOT,
  PREDICT_NEXT_DIR,
  'activity/index.ts',
);
const PREDICT_NEXT_ENTRY = path.join(REPO_ROOT, PREDICT_NEXT_DIR, 'index.ts');

const isUtilNumberZone = (zone: Zone) =>
  zone.from === 'app/util/number/index.js';
const isRouteIsolationZone = (zone: Zone) =>
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

  it.each([
    [
      'composition Views file',
      'app/components/Views/confirmations/components/modals/pay-with-modal/pay-with-modal.tsx',
    ],
    ['composition file', 'app/core/Engine/types.ts'],
    ['composition file', 'app/components/Nav/Main/MainNavigator.tsx'],
    ['legacy Predict file', 'app/components/UI/Predict/index.ts'],
    ['PredictNext file', 'app/components/UI/PredictNext/activity/index.ts'],
  ])('passes legacy and internal imports in a %s (%s)', async (_, file) => {
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
  });
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

    const messages = linter.verify(
      fs.readFileSync(absolute, 'utf8'),
      {
        parser: 'typescript',
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
        settings,
        rules: { [RULE]: ['error', { zones: zonesWithoutAllowlist }] },
      },
      { filename: absolute },
    );

    expect(messages.filter(({ ruleId }) => ruleId === RULE)).not.toEqual([]);
  });
});
