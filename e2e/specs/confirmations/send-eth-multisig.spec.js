'use strict';

import { Regression } from '../../tags';
import TestHelpers from '../../helpers';

import AmountView from '../../pages/AmountView';
import SendView from '../../pages/SendView';
import TransactionConfirmationView from '../../pages/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import root from '../../../locales/languages/en.json';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';

describe(Regression('Send ETH to Multisig'), () => {
  const multisig = SMART_CONTRACTS.MULTISIG;
  const AMOUNT_TO_SEND = '0.12345';
  const TOKEN_NAME = root.unit.eth;

  beforeAll(async () => {
    jest.setTimeout(2500000);
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort('8081'); // because on android we need to expose the localhost ports to run ganache
      await device.reverseTcpPort('8545');
    }
  });

  it('Send ETH to a Multisig address from inside MetaMask wallet', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        smartContract: multisig,
      },
      async ({ contractRegistry }) => {
        const multisig = await contractRegistry.getContractAddress(
          smartContract,
        );
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
      },
    );
  });
});
