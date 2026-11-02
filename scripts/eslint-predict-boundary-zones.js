// Generates the `import-x/no-restricted-paths` zones that fence the Predict
// boundary (PRED-1399, epic PRED-1340). Code outside
// `app/components/UI/Predict/` and `app/components/UI/PredictNext/` may import
// only the PredictNext public API, `app/components/UI/PredictNext/index.ts`.
// See app/components/UI/PredictNext/docs/public-api-contract.md.
//
// Two allowlists exempt existing importers, and they mean different things:
//
// - `predictCompositionFiles` is PERMANENT. It names the composition wiring
//   that has to reach inside Predict: Engine controller and service init,
//   messengers and Engine types, transaction-pay Polymarket callbacks, the
//   transaction-controller messenger, App toast registration and
//   MainNavigator registration (plus the colocated tests of those files).
//   Keep it small; add to it only for new wiring of the same kind.
//
// - `predictImportBurndownFiles` is TEMPORARY. Those files are allowed by
//   exception until a PRED-1340 migration ticket moves them to the public
//   API. EVERY MIGRATION PR MUST DELETE ITS FILES FROM THIS LIST. The list
//   may only shrink: scripts/eslint-predict-boundary-zones.test.ts fails if
//   an entry is added, if an entry no longer exists, or if an entry no longer
//   imports Predict internals (so a migrated file cannot stay listed).
//
// Why a computed `target` instead of override `excludedFiles`:
// ESLint replaces `import-x/no-restricted-paths` per override instead of
// merging it, so `.eslintrc.js` re-declares its zones in every override that
// sets the rule. Excluding allowlisted files through overrides would multiply
// those overrides (Views x util/number burn-down x Predict allowlist). Instead,
// the allowlists are subtracted from the zone `target` itself: `target` is
// every path under `app/` except Predict, PredictNext and the allowlisted
// files. The zones are then self-contained and can be spread verbatim into
// every override.
//
// The target is computed from the file system when ESLint loads the config,
// so a file created later in a directory that holds an allowlisted file is
// fenced from the next ESLint run on (CI always loads the config fresh; an
// editor's ESLint server may need a restart).

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');

const APP_DIR = 'app';
const PREDICT_DIR = 'app/components/UI/Predict';
const PREDICT_NEXT_DIR = 'app/components/UI/PredictNext';

/**
 * Composition wiring that may import Predict internals permanently. This is
 * not a burn-down list: entries stay until PRED-1356 removes the legacy parts
 * they wire up.
 */
const predictCompositionFiles = [
  'app/components/Nav/App/App.tsx',
  'app/components/Nav/Main/MainNavigator.tsx',
  'app/core/Engine/controllers/predict-controller/index.test.ts',
  'app/core/Engine/controllers/predict-controller/index.ts',
  'app/core/Engine/controllers/predict-service-init.test.ts',
  'app/core/Engine/controllers/predict-service-init.ts',
  'app/core/Engine/controllers/transaction-pay-controller/polymarket-callbacks.test.ts',
  'app/core/Engine/controllers/transaction-pay-controller/polymarket-callbacks.ts',
  'app/core/Engine/messengers/predict-controller-messenger/index.ts',
  'app/core/Engine/messengers/predict-live-data-service-messenger.test.ts',
  'app/core/Engine/messengers/predict-live-data-service-messenger.ts',
  'app/core/Engine/messengers/predict-market-data-service-messenger.test.ts',
  'app/core/Engine/messengers/predict-market-data-service-messenger.ts',
  'app/core/Engine/messengers/predict-order-service-messenger.test.ts',
  'app/core/Engine/messengers/predict-order-service-messenger.ts',
  'app/core/Engine/messengers/predict-portfolio-service-messenger.test.ts',
  'app/core/Engine/messengers/predict-portfolio-service-messenger.ts',
  'app/core/Engine/types.ts',
  'app/core/Engine/wallet-init/messengers/transaction-controller-messenger.ts',
];

/**
 * Burn-down allowlist: files outside Predict that still import legacy
 * `UI/Predict/` or PredictNext internals. Recorded at PRED-1399; it may only
 * shrink. Each PRED-1340 migration PR deletes the files it migrates from this
 * list. Do not add entries: import from `app/components/UI/PredictNext`
 * instead, and add the export you need to its public API.
 */
const predictImportBurndownFiles = [
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

const LINTABLE_FILE = /\.(?:[cm]?js|jsx|ts|tsx)$/;

// `import-x/no-restricted-paths` re-checks every target for every linted
// file, so a long target list is paid ~15k times per run. A directory with
// more than this many covered children collapses into one negated glob.
const MAX_PLAIN_CHILDREN = 10;

// minimatch syntax. A path containing any of these cannot go into a glob
// target verbatim, so its directory falls back to plain paths.
const GLOB_SYNTAX = /[*?[\]{}()!|+@]/;
const CAN_GLOB_ROOT = !GLOB_SYNTAX.test(REPO_ROOT);

/**
 * Returns paths under `dir` that together cover every lintable file except
 * the `excluded` paths. A directory that contains no excluded path is one
 * target. A directory on the way to an excluded path is expanded, and its
 * covered children collapse into one glob when there are many of them.
 *
 * @param {string} dir - Repo-relative directory to cover.
 * @param {string[]} excluded - Repo-relative paths to leave out.
 * @returns {string[]} Repo-relative targets: paths or globs.
 */
function coverExcept(dir, excluded) {
  const skipped = [];
  const covered = [];
  const nested = [];
  for (const entry of fs.readdirSync(path.join(REPO_ROOT, dir), {
    withFileTypes: true,
  })) {
    const entryPath = `${dir}/${entry.name}`;
    if (excluded.includes(entryPath)) {
      skipped.push(entry.name);
    } else if (
      entry.isDirectory() &&
      excluded.some((excludedPath) => excludedPath.startsWith(`${entryPath}/`))
    ) {
      skipped.push(entry.name);
      nested.push(...coverExcept(entryPath, excluded));
    } else if (entry.isDirectory() || LINTABLE_FILE.test(entry.name)) {
      covered.push(entryPath);
    }
  }
  const canGlob =
    CAN_GLOB_ROOT &&
    !GLOB_SYNTAX.test(dir) &&
    !skipped.some((name) => GLOB_SYNTAX.test(name));
  if (canGlob && covered.length > MAX_PLAIN_CHILDREN) {
    // Every child of `dir` except the skipped ones, at any depth.
    return [`${dir}/!(${skipped.join('|')}){,/**}`, ...nested];
  }
  return [...covered, ...nested];
}

const predictBoundaryTarget = coverExcept(APP_DIR, [
  PREDICT_DIR,
  PREDICT_NEXT_DIR,
  ...predictCompositionFiles,
  ...predictImportBurndownFiles,
]);

const PREDICT_BOUNDARY_MESSAGE =
  'Outside Predict, import only the PredictNext public API ' +
  "('app/components/UI/PredictNext'). If it lacks what you need, add a " +
  'named export to app/components/UI/PredictNext/index.ts. See ' +
  'app/components/UI/PredictNext/docs/public-api-contract.md and ' +
  'scripts/eslint-predict-boundary-zones.js.';

// One zone per `from`: `except` resolves relative to `from`, and the
// PredictNext entry point is not a descendant of legacy `UI/Predict/`.
const predictBoundaryZones = [
  {
    target: predictBoundaryTarget,
    from: PREDICT_DIR,
    message: `Legacy app/components/UI/Predict is private. ${PREDICT_BOUNDARY_MESSAGE}`,
  },
  {
    target: predictBoundaryTarget,
    from: PREDICT_NEXT_DIR,
    except: ['./index.ts'],
    message: `PredictNext internals are private. ${PREDICT_BOUNDARY_MESSAGE}`,
  },
];

module.exports = {
  PREDICT_DIR,
  PREDICT_NEXT_DIR,
  predictBoundaryZones,
  predictCompositionFiles,
  predictImportBurndownFiles,
};
