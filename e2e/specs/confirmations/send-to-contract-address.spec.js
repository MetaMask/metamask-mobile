'use strict';

import { SmokeConfirmations } from '../../tags';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
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
  const AMOUNT = '1';

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

  it('should send ETH to a contract from inside the wallet', async () => {
    const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSendButton();

    await SendView.inputAddress(DAI);
    await Assertions.checkIfVisible(await SendView.iUnderstandWarningButton);
    await SendView.tapIUnderstandButton();
    await Assertions.checkIfVisible(await AmountView.container);

    await AmountView.typeInTransactionAmount(AMOUNT);
    await AmountView.tapNextButton();

    await TransactionConfirmationView.tapConfirmButton();
    await TabBarComponent.tapActivity();
  });
});
