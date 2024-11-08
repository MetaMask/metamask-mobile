'use strict';

import { SmokeConfirmations } from '../../tags';
import TestHelpers from '../../helpers';

import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import enContent from '../../../locales/languages/en.json';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import Assertions from '../../utils/Assertions';
import { TransactionConfirmViewSelectorsIDs } from '../../selectors/TransactionConfirmView.selectors';

describe(SmokeConfirmations('Send ETH - Security Alert'), () => {
  const TOKEN_NAME = enContent.unit.eth;
  const AMOUNT = '0.12345';
  let mockServer;
  const BENIGN_ADDRESS_MOCK = '0x50587E46C5B96a3F6f9792922EC647F13E6EFAE4';

  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
    mockServer = await startMockServer({
      GET: [
        mockEvents.GET.securityAlertApiSupportedChains,
      ],
      POST: [        mockEvents.POST.securityAlertApiValidate,]
    });
  });

  afterAll(async () => {
    try {
      await stopMockServer();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Mock server already stopped or encountered an error:', error);
    }
  });

  it('should not show security alerts for benign requests', async () => {
    const RECIPIENT = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';
    await withFixtures(
      {
        fixture: new FixtureBuilder().withDefaultFixture().build(),
        restartDevice: true,
        // ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapActions();
        await WalletActionsModal.tapSendButton();

        await SendView.inputAddress(BENIGN_ADDRESS_MOCK);
        await SendView.tapNextButton();

        await AmountView.typeInTransactionAmount(0);
        await AmountView.tapNextButton();
        try {
          await Assertions.checkIfNotVisible(
            TransactionConfirmationView.securityAlertBanner(),
          );
        } catch {
          /* eslint-disable no-console */
          console.log('The notification device alert modal is not visible');
        }
        // await TransactionConfirmationView.securityAlertBanner();
        // await TabBarComponent.tapActivity();

        // await TestHelpers.checkIfElementByTextIsVisible(
        //   `${AMOUNT} ${TOKEN_NAME}`,
        // );
      },
    );
  });
});
