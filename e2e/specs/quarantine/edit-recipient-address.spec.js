'use strict';
import { SmokeCore } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import { loginToApp } from '../../viewHelper';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import Assertions from '../../utils/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import {
  defaultGanacheOptions,
  stopFixtureServer,
  withFixtures,
} from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import FixtureBuilder from '../../fixtures/fixture-builder';

import ActivitiesView from '../../pages/Transactions/ActivitiesView';

const INCORRECT_SEND_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';
const CORRECT_SEND_ADDRESS = '0x37cc5ef6bfe753aeaf81f945efe88134b238face';
const SHORTHAND_ADDRESS = '0x37Cc...FACE';
const fixtureServer = new FixtureServer();

describe(
  SmokeCore('Send ETH to the correct address after editing the recipient'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(2500000);
      await TestHelpers.reverseServerPort();
    });
    it('should display correct send address after edit', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withGanacheNetwork().build(),
          restartDevice: true,
          ganacheOptions: defaultGanacheOptions,
        },
        async () => {
          await loginToApp();
          await Assertions.checkIfVisible(WalletView.container);
          await TabBarComponent.tapActions();
          await TokenOverview.tapActionSheetSendButton();
          await SendView.inputAddress(INCORRECT_SEND_ADDRESS);

          await SendView.tapNextButton();
          await AmountView.typeInTransactionAmount('0.000001');

          await AmountView.tapNextButton();

          //Assert Address
          const address = await SendView.splitAddressText();
          await Assertions.checkIfTextMatches(
            address[0],
            INCORRECT_SEND_ADDRESS,
          );

          await SendView.tapBackButton();
          await AmountView.tapBackButton();
          await SendView.removeAddress();
          await SendView.inputAddress(CORRECT_SEND_ADDRESS);
          await SendView.tapNextButton();
          await AmountView.typeInTransactionAmount('0.000001');

          await AmountView.tapNextButton();

          // Assert correct address
          const correctAddress = await SendView.splitAddressText();
          await Assertions.checkIfTextMatches(
            correctAddress[0],
            CORRECT_SEND_ADDRESS,
          );
          //TODO: Currently flakey, requires more work
          //Assert transactions send screen on IOS only due to android limitations
          if (device.getPlatform() === 'ios') {
            // Tap Send
            await TransactionConfirmationView.tapConfirmButton();

            // Transactions view to assert address remains consistent
            await TabBarComponent.tapActivity();
            await TestHelpers.delay(3000);
            await ActivitiesView.tapConfirmedTransaction();
            await Assertions.checkIfTextIsDisplayed(`${SHORTHAND_ADDRESS}`);
          }
        },
      );
    });
  },
);
