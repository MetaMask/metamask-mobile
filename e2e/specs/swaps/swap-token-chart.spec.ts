gi'use strict';
import { loginToApp } from '../../viewHelper';
import { Mockttp } from 'mockttp';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletView from '../../pages/wallet/WalletView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../framework/fixtures/FixtureHelper';
import TestHelpers from '../../helpers';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import { getFixturesServerPort, getMockServerPort } from '../../fixtures/utils';
import { Regression } from '../../tags';
import Assertions from '../../framework/Assertions';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import Ganache from '../../../app/util/test/ganache';
import AdvancedSettingsView from '../../pages/Settings/AdvancedView';
import { submitSwapUnifiedUI } from '../swaps/helpers/swapUnifiedUI';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import { testSpecificMock as swapTestSpecificMock } from '../swaps/helpers/swap-mocks';
import { defaultGanacheOptions } from '../../framework/Constants';
import { prepareSwapsTestEnvironment } from './helpers/prepareSwapsTestEnvironment';

const fixtureServer: FixtureServer = new FixtureServer();

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(RegressionAssets('Swap from Token view'), (): void => {
  let localNode: Ganache;
  let mockServer: Mockttp;

  beforeAll(async (): Promise<void> => {
    localNode = new Ganache();
    await localNode.start({ ...defaultGanacheOptions, chainId: 1 });

    const mockServerPort = getMockServerPort();
    // Added to pass linting - this pattern is not recommended check other swaps test for new pattern
    mockServer = await startMockServer(
      {},
      mockServerPort,
      swapTestSpecificMock,
    );

    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withGanacheNetwork('0x1')
      .withDisabledSmartTransactions()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: {
        fixtureServerPort: `${getFixturesServerPort()}`,
        mockServerPort: `${mockServerPort}`,
      },
    });
    await loginToApp();
    await prepareSwapsTestEnvironment();
  });

  afterAll(async (): Promise<void> => {
    await stopFixtureServer(fixtureServer);
    if (mockServer) await stopMockServer(mockServer);
    if (localNode) await localNode.quit();
  });

  beforeEach(async (): Promise<void> => {
    jest.setTimeout(150000);
  });

  it('should complete a USDC to DAI swap from the token chart', async (): Promise<void> => {
    const FIRST_ROW: number = 0;
    const quantity: string = '1';
    const sourceTokenSymbol: string = 'ETH';
    const destTokenSymbol: string = 'DAI';

    await TabBarComponent.tapWallet();
    await Assertions.expectElementToBeVisible(WalletView.container);
    await WalletView.tapOnToken('Ethereum');
    await Assertions.expectElementToBeVisible(TokenOverview.container);
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(1000);
    await TokenOverview.tapSwapButton();

    // Submit the Swap
    await submitSwapUnifiedUI(
      quantity,
      sourceTokenSymbol,
      destTokenSymbol,
      '0x1',
    );

    // After the swap is complete, the DAI balance shouldn't be 0
    await Assertions.expectTextNotDisplayed('0 DAI', { timeout: 60000 });

    // Check the swap activity completed
    await Assertions.expectElementToBeVisible(ActivitiesView.title);
    await Assertions.expectElementToBeVisible(
      ActivitiesView.swapActivityTitle(sourceTokenSymbol, destTokenSymbol),
    );
    await Assertions.expectElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
    );
  });
});
