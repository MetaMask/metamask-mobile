'use strict';


import TestHelpers from '../helpers';
import {
  importWalletWithRecoveryPhrase,
  switchToTenderlyNetwork,
} from '../viewHelper';

import { Regression } from '../tags';
import TabBarComponent from '../pages/TabBarComponent';
import WalletActionsModal from '../pages/modals/WalletActionsModal';
import SwapView from '../pages/SwapView'
import Ganache from '../../app/util/test/ganache';
import Accounts from '../../wdio/helpers/Accounts';

const validAccount = Accounts.getValidAccount();

describe(Regression('Swap ETH Tests'), () => {
let ganacheServer;
  beforeAll(async () => {
    jest.setTimeout(150000);
    await importWalletWithRecoveryPhrase();
  });

  afterAll(async () => {
  })

  it('should switch to Tenderly Network ', async () => {
    await switchToTenderlyNetwork();
  });

  it('should Swap .001 ETH to DAI', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSwapButton();
    await SwapView.tapStartSwapping();
    await SwapView.enterSwapAmount(".001")
    await SwapView.tapOnSelectTokenTo()
    await SwapView.selectToken("DAI", "Dai Stablecoin")
    await device.disableSynchronization()
    await SwapView.tapOnGetQuotes()
    await SwapView.waitForNewQuoteToDisplay()
  });
})
