import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../framework/fixtures/FixtureHelper';
import { Mockttp } from 'mockttp';
import TestHelpers from '../../helpers';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import {
  getFixturesServerPort,
  getMockServerPort,
} from '../../framework/fixtures/FixtureUtils';
import { Regression } from '../../tags';
import Assertions from '../../framework/Assertions';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import { submitSwapUnifiedUI } from '../swaps/helpers/swap-unified-ui';
import { AnvilManager } from '../../seeder/anvil-manager';
import { swapSpecificMock } from '../swaps/helpers/constants';
import { stopMockServer } from '../../api-mocking/mock-server.js';
import { startSwapsMockServer } from '../swaps/helpers/swap-mocks';
import WalletView from '../../pages/wallet/WalletView';

const fixtureServer = new FixtureServer();

// eslint-disable-next-line jest/no-disabled-tests
describe(Regression('Multiple Swaps from Actions'), () => {
  const FIRST_ROW: number = 0;
  const SECOND_ROW: number = 1;
  let mockServer: Mockttp;
  let localNode = new AnvilManager();

  beforeAll(async () => {
    jest.setTimeout(2500000);

    localNode = new AnvilManager();
    await localNode.start({
      chainId: 1,
      forkUrl: `https://mainnet.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`,
    });

    const mockServerPort = getMockServerPort();
    mockServer = await startSwapsMockServer(swapSpecificMock, mockServerPort);

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
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
    if (mockServer) await stopMockServer(mockServer);
    if (localNode) await localNode.quit();
  });

  it.each`
    type            | quantity | sourceTokenSymbol | destTokenSymbol | chainId
    ${'native'}     | ${'.03'} | ${'ETH'}          | ${'DAI'}        | ${'0x1'}
    ${'unapproved'} | ${'3'}   | ${'DAI'}          | ${'USDC'}       | ${'0x1'}
    ${'erc20'}      | ${'10'}  | ${'DAI'}          | ${'ETH'}        | ${'0x1'}
  `(
    "should swap $type token '$sourceTokenSymbol' to '$destTokenSymbol' on chainID='$chainId",
    async ({ type, quantity, sourceTokenSymbol, destTokenSymbol, chainId }) => {
      await device.disableSynchronization();
      await TabBarComponent.tapWallet();
      await WalletView.tapWalletSwapButton();

      // Submit the Swap
      await submitSwapUnifiedUI(
        quantity,
        sourceTokenSymbol,
        destTokenSymbol,
        chainId,
      );

      // Check the swap activity completed
      await Assertions.expectElementToBeVisible(ActivitiesView.title);
      await Assertions.expectElementToBeVisible(
        ActivitiesView.swapActivityTitle(sourceTokenSymbol, destTokenSymbol),
      );
      await Assertions.expectElementToHaveText(
        ActivitiesView.transactionStatus(FIRST_ROW),
        ActivitiesViewSelectorsText.CONFIRM_TEXT,
        { timeout: 60000 },
      );

      // Check the token approval completed
      if (type === 'unapproved') {
        await Assertions.expectElementToBeVisible(
          ActivitiesView.approveActivity,
        );
        await Assertions.expectElementToHaveText(
          ActivitiesView.transactionStatus(SECOND_ROW),
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
          { timeout: 60000 },
        );
      }
      // Waiting toast to clear
      await TestHelpers.delay(10000);
    },
  );
});
