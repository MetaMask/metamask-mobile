'use strict';

import { SmokeConfirmations } from '../../tags';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';

import TestHelpers from '../../helpers';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';

import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Assertions from '../../utils/Assertions';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';

const HST_CONTRACT = SMART_CONTRACTS.HST;

describe(SmokeConfirmations('Send to contract address'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it('should send ETH to a contract from inside the wallet', async () => {
    const AMOUNT = '12';

    const testSpecificMock = {
      GET: [mockEvents.GET.remoteFeatureFlagsOldConfirmations],
    };

    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        smartContract: HST_CONTRACT,
        testSpecificMock,
      },
      // Remove any once withFixtures is typed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async ({ contractRegistry }: { contractRegistry: any }) => {
        const hstAddress = await contractRegistry.getContractAddress(
          HST_CONTRACT,
        );
        await loginToApp();

        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSendButton();

        await SendView.inputAddress(hstAddress);
        await SendView.tapNextButton();

        await Assertions.checkIfVisible(AmountView.title);

        await AmountView.typeInTransactionAmount(AMOUNT);
        await AmountView.tapNextButton();

        await TransactionConfirmationView.tapConfirmButton();
        await TabBarComponent.tapActivity();

        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.SMART_CONTRACT_INTERACTION,
        );
      },
    );
  });
});
