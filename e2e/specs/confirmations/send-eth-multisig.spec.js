'use strict';

import { Regression } from '../../tags';
import TestHelpers from '../../helpers';

import AmountView from '../../pages/AmountView';
import SendView from '../../pages/SendView';
import TransactionConfirmationView from '../../pages/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import Ganache from '../../../app/util/test/ganache';
import GanacheSeeder from '../../../app/util/test/ganache-seeder';
import root from '../../../locales/languages/en.json';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';

// SRP corresponding to the vault set in the default fixtures
const seedPhrase =
  'drive manage close raven tape average sausage pledge riot furnace august tip';

const MULTISIG = 'multisig';
const AMOUNT_TO_SEND = '0.12345';
const TOKEN_NAME = root.unit.eth;

describe(Regression('Send ETH to Multisig'), () => {
  let ganacheServer;
  let ganacheSeeder;
  let contractRegistry;
  let multisig;

  beforeAll(async () => {
    jest.setTimeout(2500000);
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort('8081'); // because on android we need to expose the localhost ports to run ganache
      await device.reverseTcpPort('8545');
    }
    ganacheServer = new Ganache();
    await ganacheServer.start({ mnemonic: seedPhrase });
    ganacheSeeder = new GanacheSeeder(ganacheServer.getProvider());
    await ganacheSeeder.deploySmartContract(MULTISIG);
    contractRegistry = ganacheSeeder.getContractRegistry();
    multisig = contractRegistry.getContractAddress(MULTISIG);
  });

  afterAll(async () => {
    await ganacheServer.quit();
  });

  it('Send ETH to a Multisig address from inside MetaMask wallet', async () => {
    const fixture = new FixtureBuilder().withGanacheNetwork().build();
    await withFixtures({ fixture, restartDevice: true }, async () => {
      await loginToApp();

      await TabBarComponent.tapActions();
      await WalletActionsModal.tapSendButton();

      await SendView.inputAddress(multisig);
      await SendView.tapNextButton();

      await AmountView.typeInTransactionAmount(AMOUNT_TO_SEND);
      await AmountView.tapNextButton();

      await TransactionConfirmationView.tapConfirmButton();
      await TabBarComponent.tapActivity();

      await TestHelpers.checkIfElementByTextIsVisible(
        `${AMOUNT_TO_SEND} ${TOKEN_NAME}`,
      );
    });
  });
});
