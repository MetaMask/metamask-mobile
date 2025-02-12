'use strict';

import { SmokeConfirmations } from '../../tags';
import TestHelpers from '../../helpers';

import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import enContent from '../../../locales/languages/en.json';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import Assertions from '../../utils/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import TokenOverview from '../../pages/wallet/TokenOverview';

describe(SmokeConfirmations('Send ETH'), () => {
  const TOKEN_NAME = enContent.unit.eth;
  const AMOUNT = '0.12345';

  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('should send ETH to an EOA from inside the wallet', async () => {
    const RECIPIENT = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSendButton();

        await SendView.inputAddress(RECIPIENT);
        await SendView.tapNextButton();

        await AmountView.typeInTransactionAmount(AMOUNT);
        await AmountView.tapNextButton();

        await TransactionConfirmationView.tapConfirmButton();
        await TabBarComponent.tapActivity();

        await Assertions.checkIfTextIsDisplayed(`${AMOUNT} ${TOKEN_NAME}`);
      },
    );
  });

  it('should send ETH to a Multisig from inside the wallet', async () => {
    const MULTISIG_CONTRACT = SMART_CONTRACTS.MULTISIG;

    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        smartContract: MULTISIG_CONTRACT,
      },
      async ({ contractRegistry }) => {
        const multisigAddress = await contractRegistry.getContractAddress(
          MULTISIG_CONTRACT,
        );
        await loginToApp();

        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSendButton();

        await SendView.inputAddress(multisigAddress);
        await SendView.tapNextButton();

        await AmountView.typeInTransactionAmount(AMOUNT);
        await AmountView.tapNextButton();

        await TransactionConfirmationView.tapConfirmButton();
        await TabBarComponent.tapActivity();
        await Assertions.checkIfTextIsDisplayed(`${AMOUNT} ${TOKEN_NAME}`);
      },
    );
  });

  it('should send ETH to an EOA from token detail page', async () => {
    const ETHEREUM_NAME = 'Ethereum';
    const RECIPIENT = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';
    const AMOUNT = '0.12345';
    const TOKEN_NAME = enContent.unit.eth;

    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();
        await WalletView.tapOnToken(ETHEREUM_NAME);
        await TokenOverview.tapSendButton();

        await SendView.inputAddress(RECIPIENT);
        await SendView.tapNextButton();

        await AmountView.typeInTransactionAmount(AMOUNT);
        await AmountView.tapNextButton();

        await TransactionConfirmationView.tapConfirmButton();
        await TabBarComponent.tapActivity();

        await Assertions.checkIfTextIsDisplayed(`${AMOUNT} ${TOKEN_NAME}`);
      },
    );
  });
});
