'use strict';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import SettingsView from '../../pages/Settings/SettingsView';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { Mockttp } from 'mockttp';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort, getMockServerPort } from '../../fixtures/utils.js';
import { Regression } from '../../tags';
import Assertions from '../../utils/Assertions';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import AdvancedSettingsView from '../../pages/Settings/AdvancedView';
import { submitSwapUnifiedUI } from './helpers/swapUnifiedUI';
import Ganache from '../../../app/util/test/ganache';
import { localNodeOptions, testSpecificMock } from './helpers/constants';
import { stopMockServer } from '../../api-mocking/mock-server.js';
import { startMockServer } from './helpers/swap-mocks';

const fixtureServer = new FixtureServer();

// eslint-disable-next-line jest/no-disabled-tests
describe.skip(Regression('Multiple Swaps from Actions'), () => {
  const FIRST_ROW: number = 0;
  const SECOND_ROW: number = 1;
  let mockServer: Mockttp;
  let localNode: Ganache;

  beforeAll(async () => {
    jest.setTimeout(2500000);

    localNode = new Ganache();
    await localNode.start(localNodeOptions);

    const mockServerPort = getMockServerPort();
    mockServer = await startMockServer(testSpecificMock, mockServerPort);

    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withGanacheNetwork('0x1')
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

  it('should turn off stx', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapAdvancedTitle();
    await AdvancedSettingsView.tapSmartTransactionSwitch();
    await TabBarComponent.tapWallet();
  });

  it.each`
    type            | quantity | sourceTokenSymbol | destTokenSymbol | chainId
    ${'native'}     | ${'.03'} | ${'ETH'}          | ${'DAI'}        | ${'0x1'}
    ${'unapproved'} | ${'3'}   | ${'DAI'}          | ${'USDC'}       | ${'0x1'}
    ${'erc20'}      | ${'10'}  | ${'DAI'}          | ${'ETH'}        | ${'0x1'}
  `(
    "should swap $type token '$sourceTokenSymbol' to '$destTokenSymbol' on chainID='$chainId",
    async ({ type, quantity, sourceTokenSymbol, destTokenSymbol, chainId }) => {
      await TabBarComponent.tapActions();
      await Assertions.checkIfVisible(WalletActionsBottomSheet.swapButton);
      await WalletActionsBottomSheet.tapSwapButton();

      // Submit the Swap
      await submitSwapUnifiedUI(
        quantity,
        sourceTokenSymbol,
        destTokenSymbol,
        chainId,
      );

      // Check the swap activity completed
      await Assertions.checkIfVisible(ActivitiesView.title);
      await Assertions.checkIfVisible(
        ActivitiesView.swapActivityTitle(sourceTokenSymbol, destTokenSymbol),
      );
      await Assertions.checkIfElementToHaveText(
        ActivitiesView.transactionStatus(FIRST_ROW),
        ActivitiesViewSelectorsText.CONFIRM_TEXT,
        60000,
      );

      // Check the token approval completed
      if (type === 'unapproved') {
        await Assertions.checkIfVisible(
          ActivitiesView.tokenApprovalActivity(sourceTokenSymbol),
        );
        await Assertions.checkIfElementToHaveText(
          ActivitiesView.transactionStatus(SECOND_ROW),
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
          60000,
        );
      }
    },
  );
});

