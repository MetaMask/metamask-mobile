'use strict';
import { loginToApp } from '../../viewHelper';
import { Mockttp } from 'mockttp';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletView from '../../pages/wallet/WalletView';
import SettingsView from '../../pages/Settings/SettingsView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../framework/fixtures/FixtureHelper';
import TestHelpers from '../../helpers';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import {
  getFixturesServerPort,
  getMockServerPort,
} from '../../framework/fixtures/FixtureUtils';
import { Regression } from '../../tags';
import Assertions from '../../framework/Assertions';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import Ganache from '../../../app/util/test/ganache';
import { testSpecificMock } from '../swaps/helpers/constants';
import AdvancedSettingsView from '../../pages/Settings/AdvancedView';
import { submitSwapUnifiedUI } from '../swaps/helpers/swapUnifiedUI';
import { stopMockServer } from '../../api-mocking/mock-server.js';
import { startMockServer } from '../swaps/helpers/swap-mocks';
import { defaultGanacheOptions } from '../../framework/Constants';

const fixtureServer: FixtureServer = new FixtureServer();

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(Regression('Swap from Token view'), (): void => {
  let localNode: Ganache;
  let mockServer: Mockttp;

  beforeAll(async (): Promise<void> => {
    localNode = new Ganache();
    await localNode.start({ ...defaultGanacheOptions, chainId: 1 });

    const mockServerPort = getMockServerPort();
    mockServer = await startMockServer(testSpecificMock, mockServerPort);

    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().withGanacheNetwork('0x1').build();
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
  });

  afterAll(async (): Promise<void> => {
    await stopFixtureServer(fixtureServer);
    if (mockServer) await stopMockServer(mockServer);
    if (localNode) await localNode.quit();
  });

  beforeEach(async (): Promise<void> => {
    jest.setTimeout(150000);
  });

  it('should turn off stx', async (): Promise<void> => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapAdvancedTitle();
    await AdvancedSettingsView.tapSmartTransactionSwitch();
    await TabBarComponent.tapWallet();
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
