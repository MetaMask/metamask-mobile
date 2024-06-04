'use strict';

import { SmokeConfirmations } from '../../tags';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import enContent from '../../../locales/languages/en.json';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import Assertions from '../../utils/Assertions';
import AddAddressModal from '../../pages/modals/AddAddressModal';

const fixtureServer = new FixtureServer();
const orangeFoxENS = 'orangefox.eth';
const secondENS = 'cdavid3.eth';
describe(SmokeConfirmations('Send ETH'), () => {
  const TOKEN_NAME = enContent.unit.eth;
  const AMOUNT = '2';

  beforeEach(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(CustomNetworks.Tenderly)
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
  });

  it('should send ETH to an ENS address from inside the wallet', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSendButton();

    await SendView.inputAddress(orangeFoxENS);
    await TestHelpers.delay(3000); // wait for the ens address to resolve.

    await SendView.tapAddressInputField();

    await SendView.tapBackSpaceKey();
    await SendView.inputAddress(secondENS);
    await TestHelpers.delay(3000); // wait for the ens address to resolve.

    await SendView.tapAddAddressToAddressBook(); // tapping outside input box to dismiss keyboard
    // After inputting an ENS address, it takes a few seconds to resolve, upon resolving, the keyboard expands again
    try {
      await AddAddressModal.tapCancelButton();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Save address modal did not appear: ${e}`);
    }
    await SendView.tapNextButton();

    await AmountView.typeInTransactionAmount(AMOUNT);
    await AmountView.tapNextButton();

    await Assertions.checkIfTextIsDisplayed(secondENS);
    await TransactionConfirmationView.tapConfirmButton();
    await Assertions.checkIfNotVisible(
      await TransactionConfirmationView.transactionViewContainer,
    );
    await TabBarComponent.tapActivity();

    await TestHelpers.checkIfElementByTextIsVisible(`${AMOUNT} ${TOKEN_NAME}`);
  });
});
