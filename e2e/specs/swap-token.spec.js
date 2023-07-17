'use strict';


import TestHelpers from '../helpers';
import {
  importWalletWithRecoveryPhrase,
  addLocalhostNetwork,
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
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort('8081'); // because on android we need to expose the localhost ports to run ganache
      await device.reverseTcpPort('8545');
    }
    ganacheServer = new Ganache();
    await ganacheServer.start({ mnemonic: validAccount.seedPhrase, chainId: 1 })
    /*,  accounts: [
      {
        secretKey:
          '0x7C9529A67102755B7E6102D6D950AC5D5863C98713805CEC576B945B15B71EAC',
        balance: 25000000000000000000,
      },
    ],
    */

    const accounts = await ganacheServer.getAccounts()
    console.log(JSON.stringify(accounts[0]))
  });

  afterAll(async () => {
    await ganacheServer.quit();
  })


  it('should Swap .001 ETH to DAI', async () => {

    await importWalletWithRecoveryPhrase();
    await addLocalhostNetwork('1');
    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSwapButton();
    await SwapView.tapStartSwapping();
    await SwapView.enterSwapAmount(".001")
    await SwapView.tapOnSelectTokenTo()
    await SwapView.selectToken("DAI")
    await SwapView.tapOnGetQuotes()
    await SwapView.waitForNewQuoteToDisplay()

  });
})
