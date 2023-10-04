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

describe(Regression('Gas Estimates'), () => {
  async function mockGasApiDown(mockServer) {
    return await mockServer
      .forGet(
        'https://gas-api.metaswap.codefi.network/networks/1337/suggestedGasFees',
      )
      .always()
      .thenCallback(() => ({
        statusCode: 500,
      }));
  }

  const TOKEN_NAME = root.unit.eth;
  const AMOUNT = '1';
  const RECIPIENT = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';

  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('show expected gas defaults when API is down', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        mocks: true,
        testSpecificMock: mockGasApiDown,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapActions();
        await WalletActionsModal.tapSendButton();

        await SendView.inputAddress(RECIPIENT);
        await SendView.tapNextButton();

        await AmountView.typeInTransactionAmount(AMOUNT);
        await AmountView.tapNextButton();

        // Check that we are on the confirm view
        await TransactionConfirmationView.isVisible();

        // Check different gas options
        await TransactionConfirmationView.tapEstimatedGasLink();
        await TransactionConfirmationView.isPriorityEditScreenVisible();
        await TransactionConfirmationView.tapLowPriorityGasOption();
        await TransactionConfirmationView.tapAdvancedOptionsPriorityGasOption();
        await TransactionConfirmationView.tapMarketPriorityGasOption();
        await TransactionConfirmationView.isMaxPriorityFeeCorrect('1.5');
        await TransactionConfirmationView.tapAggressivePriorityGasOption();
        await TransactionConfirmationView.isMaxPriorityFeeCorrect('2');
        await TransactionConfirmationView.tapAdvancedOptionsPriorityGasOption();
        await TransactionConfirmationView.tapMaxPriorityFeeSaveButton();
        await TransactionConfirmationView.isVisible();

        //const priorityFeeVisible = await TransactionConfirmationView.isMaxPriorityFeeVisible();
        //expect(priorityFeeVisible).toBe(false);

        // Tap on the send button
        await TransactionConfirmationView.tapConfirmButton();

        await TabBarComponent.tapActivity();
        await TestHelpers.checkIfElementByTextIsVisible(
          `${AMOUNT} ${TOKEN_NAME}`,
        );

      },
    );
  });
});
