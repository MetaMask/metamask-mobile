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

const fixtureServer = new FixtureServer();

describe(SmokeConfirmations('Send ETH'), () => {
  const TOKEN_NAME = enContent.unit.eth;
  const AMOUNT = '0.12345';

  beforeEach(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(CustomNetworks.Tenderly)
      .withAddressBookController({
        addressBook: {
          '0x1': {
            '0x2f318C334780961FB129D2a6c30D0763d9a5C970': {
              address: '0x2f318C334780961FB129D2a6c30D0763d9a5C970',
              chainId: '0x1',
              isEns: false,
              memo: '',
              name: 'Test Name 1',
            },
          },
        },
      })
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

  it('should send ETH to a contact from inside the wallet', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSendButton();
    await SendView.scrollToSavedAccount();

    await SendView.tapAccountName('Test Name 1');

    await SendView.tapNextButton();

    await AmountView.typeInTransactionAmount(AMOUNT);
    await AmountView.tapNextButton();
    await Assertions.checkIfTextIsDisplayed('Test Name 1');
    await TransactionConfirmationView.tapConfirmButton();
    await TabBarComponent.tapActivity();
    await Assertions.checkIfTextIsDisplayed(`${AMOUNT} ${TOKEN_NAME}`);
  });
});
