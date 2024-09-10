'use strict';
import { loginToApp } from '../../viewHelper';
import Onboarding from '../../pages/swaps/OnBoarding';
import QuoteView from '../../pages/swaps/QuoteView';
import SwapView from '../../pages/swaps/SwapView';
import TabBarComponent from '../../pages/TabBarComponent';
import ActivitiesView from '../../pages/ActivitiesView';
import DetailsModal from '../../pages/modals/DetailsModal';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import WalletView from '../../pages/wallet/WalletView';
import DetectedTokensView from '../../pages/wallet/DetectedTokensView';
import FixtureBuilder from '../../fixtures/fixture-builder';
import Tenderly from '../../tenderly'
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { SmokeSwaps } from '../../tags';
import Assertions from '../../utils/Assertions';

const fixtureServer = new FixtureServer();

describe(SmokeSwaps('Swap from Actions'), () => {
  let swapOnboarded = true; // TODO: Set it to false once we show the onboarding page again.
  let tokenDetected = false;

  const TenderlyMainnet = new Tenderly(1)

  beforeAll(async () => {

    await TenderlyMainnet.createVirtualTestNet()
    await TenderlyMainnet.addFunds("0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3", "0xDE0B6B3A7640000",)
    CustomNetworks.TenderlyMainnet.providerConfig.rpcUrl = TenderlyMainnet.getRpcURL()
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      //.withNetworkController( CustomNetworks.TenderlyAvalance)
      .withNetworkController( CustomNetworks.TenderlyMainnet)
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
    await TenderlyMainnet.deleteVirtualTestNet()
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it.each`
    quantity | sourceTokenSymbol | destTokenSymbol
    ${'.05'} | ${'ETH'}          | ${'DAI'}
    ${'100'} | ${'DAI'}          | ${'ETH'}
  `(
    "should Swap $quantity '$sourceTokenSymbol' to '$destTokenSymbol'",
    async ({ quantity, sourceTokenSymbol, destTokenSymbol }) => {
      await TabBarComponent.tapWallet();
      await TabBarComponent.tapActions();
      await WalletActionsModal.tapSwapButton();

      if (!swapOnboarded) {
        await Onboarding.tapStartSwapping();
        swapOnboarded = true;
      }
      await Assertions.checkIfVisible(QuoteView.getQuotes);

      //Select source token, if ETH then can skip because already selected
      if (sourceTokenSymbol !== 'ETH') {
        await QuoteView.tapOnSelectSourceToken();
        await QuoteView.tapSearchToken();
        await QuoteView.typeSearchToken(sourceTokenSymbol);
        await TestHelpers.delay(1000);
        await QuoteView.selectToken(sourceTokenSymbol);
      }
      await QuoteView.enterSwapAmount(quantity);

      //Select destination token
      await QuoteView.tapOnSelectDestToken();
      await QuoteView.tapSearchToken();
      await QuoteView.typeSearchToken(destTokenSymbol);
      await TestHelpers.delay(1000);
      await QuoteView.selectToken(destTokenSymbol);

      //Make sure slippage is zero for wrapped tokens
      if (sourceTokenSymbol === 'WETH' || destTokenSymbol === 'WETH') {
        await Assertions.checkIfElementToHaveText(
          QuoteView.maxSlippage,
          'Max slippage 0%',
        );
      }
      await QuoteView.tapOnGetQuotes();
      await Assertions.checkIfVisible(SwapView.fetchingQuotes);
      await Assertions.checkIfVisible(SwapView.quoteSummary);
      await Assertions.checkIfVisible(SwapView.gasFee);
      await SwapView.tapIUnderstandPriceWarning();
      await SwapView.swipeToSwap();
      try {
        await Assertions.checkIfVisible(
          SwapView.swapCompleteLabel(sourceTokenSymbol, destTokenSymbol),
          30000,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`Toast message is slow to appear or did not appear: ${e}`);
      }
      await device.enableSynchronization();
      await TestHelpers.delay(5000);

      if (!tokenDetected) {
        tokenDetected = true
        await TabBarComponent.tapWallet();
        await WalletView.tapNewTokensFound();
        await DetectedTokensView.tapImport();
        await Assertions.checkIfVisible(WalletView.container);
      }

      await TabBarComponent.tapActivity();
      await Assertions.checkIfVisible(ActivitiesView.title);
      await Assertions.checkIfVisible(
        ActivitiesView.swapActivity(sourceTokenSymbol, destTokenSymbol),
      );
      await ActivitiesView.tapOnSwapActivity(
        sourceTokenSymbol,
        destTokenSymbol,
      );

      try {
        await Assertions.checkIfVisible(DetailsModal.title);
      } catch (e) {
        await ActivitiesView.tapOnSwapActivity(
          sourceTokenSymbol,
          destTokenSymbol,
        );
        await Assertions.checkIfVisible(DetailsModal.title);
      }
      await Assertions.checkIfElementToHaveText(
        DetailsModal.title,
        DetailsModal.generateExpectedTitle(sourceTokenSymbol, destTokenSymbol),
      );
      await Assertions.checkIfVisible(DetailsModal.statusConfirmed);
      await DetailsModal.tapOnCloseIcon();
      await Assertions.checkIfNotVisible(DetailsModal.title);
    },
  );
});
