/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import { WalletViewSelectorsIDs } from '../../../../app/components/Views/Wallet/WalletView.testIds';
import { TokenOverviewSelectorsIDs } from '../../../../app/components/UI/AssetOverview/TokenOverview.testIds';
import { scenarioTest } from './scenarioTest';

scenarioTest(path.join(__dirname, 'asset-view.scenario.md'), [
  ...Object.values(WalletViewSelectorsIDs),
  WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('tokens'),
  'asset-ETH',
  ...Object.values(TokenOverviewSelectorsIDs),
]);
