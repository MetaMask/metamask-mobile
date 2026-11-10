/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import { WalletViewSelectorsIDs } from '../../../../app/components/Views/Wallet/WalletView.testIds';
import { scenarioTest } from './scenarioTest';

// Tagged @PerformanceShadow in the scenario file; never picked up by scheduled CI.
scenarioTest(path.join(__dirname, 'predict-market-details.scenario.md'), [
  ...Object.values(WalletViewSelectorsIDs),
  'homepage-section-title-predictions',
  'predict-home-container',
  'predict-home-scroll-view',
  'predict-home-categories-tile-politics',
  'predict-feed-view-container',
  'predict-feed-view-market-list',
  'predict-feed-view-market-card-1',
  'predict-market-details-tab-bar-tab-about',
]);
