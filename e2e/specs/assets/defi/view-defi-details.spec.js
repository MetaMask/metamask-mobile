'use strict';
import { loginToApp } from '../../../viewHelper';
import { SmokeNetworkAbstractions } from '../../../tags';
import WalletView from '../../../pages/wallet/WalletView';
import Assertions from '../../../utils/Assertions';
import TestHelpers from '../../../helpers';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import { withFixtures } from '../../../fixtures/fixture-helper';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';

describe(SmokeNetworkAbstractions('View DeFi details'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('open the Aave V3 position details', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
        testSpecificMock: {
          GET: [mockEvents.GET.defiPositionsWithData],
        },
        languageAndLocale: {
          language: 'en',
          locale: 'en_US',
        },
      },
      async () => {
        await loginToApp();

        await Assertions.checkIfVisible(WalletView.container);
        await Assertions.checkIfVisible(WalletView.defiTab);

        await WalletView.tapOnDeFiTab();

        await Assertions.checkIfVisible(WalletView.defiTabContainer);
        await WalletView.tapOnDeFiPosition('Aave V3');

        await Assertions.checkIfVisible(
          WalletView.defiPositionDetailsContainer,
        );
        await Assertions.checkIfTextIsDisplayed('Aave V3');
        await Assertions.checkIfTextIsDisplayed('$14.74');
        await Assertions.checkIfTextIsDisplayed('USDT');
        await Assertions.checkIfTextIsDisplayed('$0.30');
        await Assertions.checkIfTextIsDisplayed('0.30011 USDT');
        await Assertions.checkIfTextIsDisplayed('WETH');
        await Assertions.checkIfTextIsDisplayed('$14.44');
        await Assertions.checkIfTextIsDisplayed('0.00903 WETH');
      },
    );
  });
});
