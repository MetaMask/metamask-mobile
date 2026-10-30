/**
 * Proves the Predict boundary fence (PRED-1399) holds in every ESLint
 * override, and keeps its burn-down allowlist shrinking.
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
  predictImportBurndownFiles,
} = require('./eslint-predict-boundary-zones');
/* eslint-enable @typescript-eslint/no-require-imports, import-x/no-commonjs */

const RULE = 'import-x/no-restricted-paths';
const REPO_ROOT = path.join(__dirname, '..');

/**
 * The burn-down list as recorded at PRED-1399. `predictImportBurndownFiles`
 * may only lose entries: a migration PR deletes its files from that list and
 * leaves this one alone. Never add a path here to make a new import pass;
 * import from `app/components/UI/PredictNext` instead.
 */
const BURNDOWN_BASELINE = [
  'app/components/UI/Money/components/MoneyTransferSheet/MoneyTransferSheet.test.tsx',
  'app/components/UI/Money/components/MoneyTransferSheet/MoneyTransferSheet.tsx',
  'app/components/UI/Rewards/components/Campaigns/PredictThePitchCampaignCTA.test.tsx',
  'app/components/UI/Rewards/components/Campaigns/PredictThePitchCampaignCTA.tsx',
  'app/components/UI/Rewards/components/Campaigns/PredictThePitchPositionRows.test.tsx',
  'app/components/UI/Rewards/components/Campaigns/PredictThePitchPositionRows.tsx',
  'app/components/UI/UiSlots/contractRegistry.ts',
  'app/components/UI/UiSlots/registry.ts',
  'app/components/UI/UrlAutocomplete/index.tsx',
  'app/components/Views/ActivityDetails/ActivityDetails.predict.view.test.tsx',
  'app/components/Views/ActivityList/ActivityList.tsx',
  'app/components/Views/Homepage/BalanceBreakdown/hooks/slices/usePredictSlice.test.ts',
  'app/components/Views/Homepage/BalanceBreakdown/hooks/slices/usePredictSlice.ts',
  'app/components/Views/Homepage/Homepage.tsx',
  'app/components/Views/Homepage/Sections/Predictions/PredictionsSection.test.tsx',
  'app/components/Views/Homepage/Sections/Predictions/PredictionsSection.tsx',
  'app/components/Views/Homepage/Sections/Predictions/components/HomepagePredictDiscovery/BtcLiveRow.test.tsx',
  'app/components/Views/Homepage/Sections/Predictions/components/HomepagePredictDiscovery/BtcLiveRow.tsx',
  'app/components/Views/Homepage/Sections/Predictions/components/HomepagePredictDiscovery/ChampionshipRow.tsx',
  'app/components/Views/Homepage/Sections/Predictions/components/HomepagePredictDiscovery/index.test.tsx',
  'app/components/Views/Homepage/Sections/Predictions/components/HomepagePredictDiscovery/index.tsx',
  'app/components/Views/Homepage/Sections/Predictions/components/HomepagePredictPositions.tsx',
  'app/components/Views/Homepage/Sections/Predictions/components/HomepagePredictTrendingCarousel.tsx',
  'app/components/Views/Homepage/Sections/Predictions/components/HomepagePredictTrendingMarkets.tsx',
  'app/components/Views/Homepage/Sections/Predictions/components/PredictMarketCard.tsx',
  'app/components/Views/Homepage/Sections/Predictions/components/PredictPositionRow.tsx',
  'app/components/Views/Homepage/Sections/Predictions/constants/homepagePredictMarketSlots.ts',
  'app/components/Views/Homepage/Sections/Predictions/hooks/useHomepagePredictMarketSlots.test.ts',
  'app/components/Views/Homepage/Sections/Predictions/hooks/useHomepagePredictMarketSlots.ts',
  'app/components/Views/Homepage/Sections/Predictions/hooks/useHomepagePredictWorldCupMarkets.test.ts',
  'app/components/Views/Homepage/Sections/Predictions/hooks/useHomepagePredictWorldCupMarkets.ts',
  'app/components/Views/Homepage/Sections/Predictions/hooks/usePredictMarketsForHomepage.test.ts',
  'app/components/Views/Homepage/Sections/Predictions/hooks/usePredictMarketsForHomepage.ts',
  'app/components/Views/Homepage/Sections/Predictions/hooks/usePredictPositionsForHomepage.test.ts',
  'app/components/Views/Homepage/Sections/Predictions/hooks/usePredictPositionsForHomepage.ts',
  'app/components/Views/Homepage/Sections/Predictions/hooks/usePredictionsSectionNavigation.ts',
  'app/components/Views/Homepage/Sections/Predictions/utils/getPredictHomepageUnrealizedPnlRowState.ts',
  'app/components/Views/Homepage/Sections/Predictions/utils/marketResolvers.test.ts',
  'app/components/Views/Homepage/Sections/Predictions/utils/marketResolvers.ts',
  'app/components/Views/Homepage/components/HomepageActionButtonsGrid/HomepageActionButtonsGrid.test.tsx',
  'app/components/Views/Homepage/components/HomepageActionButtonsGrid/buttons/PredictButton.tsx',
  'app/components/Views/Homepage/components/HomepageDiscoveryPills/HomepageDiscoveryPills.test.tsx',
  'app/components/Views/Homepage/components/HomepageDiscoveryPills/HomepageDiscoveryPills.tsx',
  'app/components/Views/Homepage/components/HomepageDiscoveryPills/useHomepageDiscoveryPillsNavigation.ts',
  'app/components/Views/TradeWalletActions/TradeWalletActions.test.tsx',
  'app/components/Views/TradeWalletActions/TradeWalletActions.tsx',
  'app/components/Views/TrendingView/feeds/predictions/PredictionRowItem.test.tsx',
  'app/components/Views/TrendingView/feeds/predictions/PredictionRowItem.tsx',
  'app/components/Views/TrendingView/feeds/predictions/PredictionsCarouselSection.tsx',
  'app/components/Views/TrendingView/feeds/predictions/PredictionsSkeleton.tsx',
  'app/components/Views/TrendingView/feeds/predictions/predictionsNavigation.test.ts',
  'app/components/Views/TrendingView/feeds/predictions/predictionsNavigation.ts',
  'app/components/Views/TrendingView/feeds/predictions/usePredictionsFeed.ts',
  'app/components/Views/TrendingView/feeds/predictions/useSportsMarketsFeed.test.ts',
  'app/components/Views/TrendingView/feeds/predictions/useSportsMarketsFeed.ts',
  'app/components/Views/TrendingView/feeds/search-utils.ts',
  'app/components/Views/TrendingView/search/SearchFeedRow.test.tsx',
  'app/components/Views/TrendingView/search/SearchFeedRow.tsx',
  'app/components/Views/TrendingView/tabs/MacroTab.tsx',
  'app/components/Views/TrendingView/tabs/NowTab.test.tsx',
  'app/components/Views/TrendingView/tabs/NowTab.tsx',
  'app/components/Views/TrendingView/tabs/RwasTab.tsx',
  'app/components/Views/TrendingView/tabs/SportsTab.test.tsx',
  'app/components/Views/TrendingView/tabs/SportsTab.tsx',
  'app/components/Views/WalletActions/WalletActions.tsx',
  'app/components/Views/confirmations/__mocks__/controllers/other-controllers-mock.ts',
  'app/components/Views/confirmations/components/modals/pay-with-modal/pay-with-modal.test.tsx',
  'app/components/Views/confirmations/components/modals/pay-with-modal/pay-with-modal.tsx',
  'app/components/Views/confirmations/components/predict-confirmations/predict-claim-amount/predict-claim-amount.test.tsx',
  'app/components/Views/confirmations/components/predict-confirmations/predict-claim-amount/predict-claim-amount.tsx',
  'app/components/Views/confirmations/components/predict-confirmations/predict-claim-footer/predict-claim-footer.tsx',
  'app/components/Views/confirmations/components/predict-confirmations/predict-withdraw-balance/predict-withdraw-balance.test.tsx',
  'app/components/Views/confirmations/components/predict-confirmations/predict-withdraw-balance/predict-withdraw-balance.tsx',
  'app/components/Views/confirmations/components/rows/predict-account-picker-row/predict-account-picker-row.tsx',
  'app/components/Views/confirmations/hooks/gas/usePredictWithdrawGasFeeToken.ts',
  'app/components/Views/confirmations/hooks/metrics/usePredictClaimConfirmationMetrics.ts',
  'app/components/Views/confirmations/hooks/pay/sections/usePayWithCryptoSection.test.tsx',
  'app/components/Views/confirmations/hooks/pay/sections/usePayWithCryptoSection.ts',
  'app/components/Views/confirmations/hooks/pay/sections/usePayWithPredictSection.test.tsx',
  'app/components/Views/confirmations/hooks/pay/sections/usePayWithPredictSection.tsx',
  'app/components/Views/confirmations/hooks/pay/useMoneyPredictDeposit.test.ts',
  'app/components/Views/confirmations/hooks/pay/useMoneyPredictDeposit.ts',
  'app/components/Views/confirmations/hooks/pay/usePaySectionSourceMetrics.test.ts',
  'app/components/Views/confirmations/hooks/pay/usePaySectionSourceMetrics.ts',
  'app/components/Views/confirmations/hooks/pay/useTransactionPayBalance.test.ts',
  'app/components/Views/confirmations/hooks/pay/useTransactionPayBalance.ts',
  'app/components/Views/confirmations/hooks/pay/useTransactionPayMetrics.test.ts',
  'app/components/Views/confirmations/hooks/pay/useTransactionPayPostQuote.test.ts',
  'app/components/Views/confirmations/hooks/pay/useTransactionPayPostQuote.ts',
  'app/components/Views/confirmations/hooks/transactions/usePredictSubAccounts.test.ts',
  'app/components/Views/confirmations/hooks/transactions/usePredictSubAccounts.ts',
  'app/components/Views/confirmations/hooks/transactions/useTransactionCustomAmount.test.ts',
  'app/core/DeeplinkManager/handlers/intent/__tests__/handlePredictUrl.test.ts',
  'app/core/DeeplinkManager/handlers/intent/handlePredictUrl.ts',
  'app/core/Engine/controllers/ui-slots-controller/UiSlotsController.test.ts',
  'app/core/Engine/controllers/ui-slots-controller/contracts/v1.test.ts',
  'app/core/NavigationService/types.ts',
  'app/selectors/featureFlagController/mocks.ts',
];

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
    ['burn-down Views file', 'app/components/Views/Homepage/Homepage.tsx'],
    [
      'burn-down non-Views file',
      'app/components/UI/Money/components/MoneyTransferSheet/MoneyTransferSheet.tsx',
    ],
    ['burn-down test support', 'app/selectors/featureFlagController/mocks.ts'],
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
  it('never grows the burn-down list', () => {
    const added = predictImportBurndownFiles.filter(
      (file: string) => !BURNDOWN_BASELINE.includes(file),
    );

    // A new file here means new code imports Predict internals. Import from
    // app/components/UI/PredictNext instead.
    expect(added).toEqual([]);
    expect(new Set(predictImportBurndownFiles).size).toBe(
      predictImportBurndownFiles.length,
    );
  });

  it('keeps composition wiring off the burn-down list', () => {
    const both = predictCompositionFiles.filter((file: string) =>
      predictImportBurndownFiles.includes(file),
    );

    expect(both).toEqual([]);
  });

  // An allowlisted file that no longer imports Predict internals must leave
  // its list, so a migration PR cannot finish with its files still exempt.
  it.each([
    ...predictImportBurndownFiles.map((file: string) => ['burn-down', file]),
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
