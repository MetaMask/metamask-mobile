'use strict';

import { Smoke } from '../../tags';
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

describe(Smoke('Send ETH to Multisig'), () => {
  const MULTISIG_CONTRACT = SMART_CONTRACTS.MULTISIG;
  const AMOUNT_TO_SEND = '0.12345';
  const TOKEN_NAME = root.unit.eth;
  let ganache;

  beforeAll(async () => {
    jest.setTimeout(2500000);
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort('8545'); // ganache
    }
  });

  afterEach(async () => {
    await ganache.quit();
    await TestHelpers.delay(3000);
  });

  it('Send ETH to a Multisig address from inside MetaMask wallet', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        smartContract: MULTISIG_CONTRACT,
      },
      async ({ contractRegistry, ganacheServer }) => {
        ganache = ganacheServer;
        const multisigAddress = await contractRegistry.getContractAddress(
          MULTISIG_CONTRACT,
        );
        await loginToApp();

        await TabBarComponent.tapActions();
        await WalletActionsModal.tapSendButton();

        await SendView.inputAddress(multisigAddress);
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
