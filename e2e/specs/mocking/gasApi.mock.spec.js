'use strict';

import { Regression } from '../../tags';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import SendView from '../../pages/Send/SendView';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import AmountView from '../../pages/Send/AmountView';
import fetch from 'node-fetch';
import {
  startWireMockServer,
  stopWireMockServer,
} from '../../mocks/wiremockServer';
import TestHelpers from '../../helpers';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';
import { GAS_BASE_URL } from '../../mocks/config';

describe(
  Regression(
    'Mock fallback to legacy eth estimate when EIP1559APIEndpoint gas endpoint returns 500',
  ),
  () => {
    const RECIPIENT = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';

    beforeAll(async () => {
      jest.setTimeout(150000);
      await device.launchApp({
        newInstance: true,
        launchArgs: { MOCK_GAS_BASE_URL: 'http://localhost:8080' },
      });

      startWireMockServer();

      // Delay to ensure WireMock is fully started
      await TestHelpers.delay(2000);
    });

    it('should import wallet and go to the wallet view', async () => {
      await importWalletWithRecoveryPhrase();
    });

    it('should send a transaction', async () => {
      await TabBarComponent.tapActions();
      await WalletActionsModal.tapSendButton();
      await SendView.inputAddress(RECIPIENT);
      await SendView.tapNextButton();

      await AmountView.typeInTransactionAmount('0.00002');
      await AmountView.tapNextButton();
      await Gestures.swipe(Matchers.getElementByID('confirm-txn-amount'), 'up');
      await element(by.id('estimated-fee')).atIndex(1).tap();
    });

    afterAll(async () => {
      // stopWireMockServer();
    });
  },
);
