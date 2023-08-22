'use strict';

import { Regression } from '../../tags';
import TestHelpers from '../../helpers';

import AmountView from '../../pages/AmountView';
import SendView from '../../pages/SendView';
import TransactionConfirmationView from '../../pages/TransactionConfirmView';
import {
  importWalletWithRecoveryPhrase,
  addLocalhostNetwork,
} from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import Accounts from '../../../wdio/helpers/Accounts';
import Ganache from '../../../app/util/test/ganache';
import GanacheSeeder from '../../../app/util/test/ganache-seeder';
import root from '../../../locales/languages/en.json';

const validAccount = Accounts.getValidAccount();
const AMOUNT_TO_SEND = '0.12345';
const TOKEN_NAME = root.unit.eth;

describe(Regression('Send tests'), () => {
  let ganacheServer;
  let contractSeeder;
  let multisig;

  beforeAll(async () => {
    jest.setTimeout(2500000);
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort('8081'); // because on android we need to expose the localhost ports to run ganache
      await device.reverseTcpPort('8545');
    }
    ganacheServer = new Ganache();
    await ganacheServer.start({ mnemonic: validAccount.seedPhrase });
    contractSeeder = new GanacheSeeder(ganacheServer.getProvider());
    multisig = await contractSeeder.deploySmartContract('multisig');
  });

  afterAll(async () => {
    await ganacheServer.quit();
  });

  it('Send ETH to a Multisig address from inside MetaMask wallet', async () => {
    await importWalletWithRecoveryPhrase();
    await addLocalhostNetwork();

    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSendButton();

    await SendView.inputAddress(multisig);
    await SendView.tapNextButton();

    await AmountView.typeInTransactionAmount(AMOUNT_TO_SEND);
    await AmountView.tapNextButton();

    await TransactionConfirmationView.tapConfirmButton();
    await TabBarComponent.tapActivity();

    await TestHelpers.checkIfElementByTextIsVisible(
      AMOUNT_TO_SEND + ' ' + TOKEN_NAME,
    );
  });
});
