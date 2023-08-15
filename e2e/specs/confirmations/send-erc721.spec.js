'use strict';

import { Regression } from '../../tags';
import TestHelpers from '../../helpers';
import {
  importWalletWithRecoveryPhrase,
  addLocalhostNetwork,
} from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import Accounts from '../../../wdio/helpers/Accounts';
import Ganache from '../../../app/util/test/ganache';
import Browser from '../../pages/Drawer/Browser';
import ConnectModal from '../../pages/modals/ConnectModal';
import { TEST_DAPP_URL, TestDApp } from '../../pages/TestDApp';
import root from '../../../locales/languages/en.json';
import messages from '../../../locales/languages/en.json';

const CONFIRM_BUTTON_TEXT = messages.confirmation_modal.confirm_cta;
const validAccount = Accounts.getValidAccount();
const ERC721_ADDRESS = '0x26D6C3e7aEFCE970fe3BE5d589DbAbFD30026924';

describe(Regression('Send token tests'), () => {
  let ganacheServer;
  beforeAll(async () => {
    jest.setTimeout(150000);
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort('8081'); // because on android we need to expose the localhost ports to run ganache
      await device.reverseTcpPort('8545');
    }
    ganacheServer = new Ganache();
    await ganacheServer.start({ mnemonic: validAccount.seedPhrase });
  });

  afterAll(async () => {
    await ganacheServer.quit();
  });

  it('Send an ERC721 token', async () => {
    // Setup
    await importWalletWithRecoveryPhrase();
    await addLocalhostNetwork();

    // Navigate to the browser screen
    await TabBarComponent.tapBrowser();

    // Navigate to the ERC721 url
    await TestDApp.navigateToErc721Contract(TEST_DAPP_URL, ERC721_ADDRESS);

    // Connect account
    await Browser.tapConnectButton();
    await ConnectModal.tapConnectButton();

    // Transfer NFT
    await TestDApp.tapTransferFromButton(ERC721_ADDRESS);
    await TestHelpers.delay(3000);

    await TestHelpers.tapByText(CONFIRM_BUTTON_TEXT, 0);

    // Navigate to the activity screen
    await TabBarComponent.tapActivity();

    // Assert collectible is sent
    await TestHelpers.checkIfElementByTextIsVisible(
      root.transactions.sent_collectible,
    );
  });
});
