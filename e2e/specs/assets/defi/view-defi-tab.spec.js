'use strict';
import { loginToApp } from '../../../viewHelper';
import { SmokeNetworkAbstractions } from '../../../tags';
import WalletView from '../../../pages/wallet/WalletView';
import Assertions from '../../../utils/Assertions';
import TestHelpers from '../../../helpers';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import { withFixtures } from '../../../fixtures/fixture-helper';
import { WalletViewSelectorsText } from '../../../selectors/wallet/WalletView.selectors';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';

describe(SmokeNetworkAbstractions('View DeFi tab'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('open the DeFi tab with an address that has no positions', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: {
          GET: [mockEvents.GET.defiPositionsWithNoData],
        },
      },
      async () => {
        await loginToApp();

        await Assertions.checkIfVisible(WalletView.container);
        await Assertions.checkIfVisible(WalletView.defiTab);

        await WalletView.tapOnDeFiTab();

        await Assertions.checkIfNotVisible(WalletView.defiTabContainer);
        await Assertions.checkIfTextIsDisplayed(
          WalletViewSelectorsText.DEFI_NO_POSITIONS,
        );
      },
    );
  });

  it('open the DeFi tab when the position fetching fails', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: {
          GET: [mockEvents.GET.defiPositionsError],
        },
      },
      async () => {
        await loginToApp();

        await Assertions.checkIfVisible(WalletView.container);
        await Assertions.checkIfVisible(WalletView.defiTab);

        await WalletView.tapOnDeFiTab();

        await Assertions.checkIfNotVisible(WalletView.defiTabContainer);
        await Assertions.checkIfTextIsDisplayed(
          WalletViewSelectorsText.DEFI_ERROR_CANNOT_LOAD_PAGE,
        );
        await Assertions.checkIfTextIsDisplayed(
          WalletViewSelectorsText.DEFI_ERROR_VISIT_AGAIN,
        );
      },
    );
  });

  it('open the DeFi tab with an address that has positions', async () => {
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
        await Assertions.checkIfTextIsDisplayed('Aave V2');
        await Assertions.checkIfTextIsDisplayed('$14.74');
        await Assertions.checkIfTextIsDisplayed('Aave V3');
        await Assertions.checkIfTextIsDisplayed('$0.33');
        await Assertions.checkIfTextIsNotDisplayed('Uniswap V2');
        await Assertions.checkIfTextIsNotDisplayed('$4.24');
        await Assertions.checkIfTextIsNotDisplayed('Uniswap V3');
        await Assertions.checkIfTextIsNotDisplayed('$8.48');

        await WalletView.tapOnDeFiNetworksFilter();
        await WalletView.tapTokenNetworkFilterAll();

        await Assertions.checkIfTextIsDisplayed('Aave V2');
        await Assertions.checkIfTextIsDisplayed('$14.74');
        await Assertions.checkIfTextIsDisplayed('Aave V3');
        await Assertions.checkIfTextIsDisplayed('$0.33');
        await Assertions.checkIfTextIsDisplayed('Uniswap V2');
        await Assertions.checkIfTextIsDisplayed('$4.24');
        await Assertions.checkIfTextIsDisplayed('Uniswap V3');
        await Assertions.checkIfTextIsDisplayed('$8.48');
      },
    );
  });
});
