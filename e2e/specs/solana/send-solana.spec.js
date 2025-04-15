'use strict';
import { SmokeConfirmations } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import Gestures from '../../utils/Gestures';
import SendView from '../../pages/Send/SendView';
import WalletViewSelectorsText from '../../selectors/wallet/WalletView.selectors.js';

const VALID_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';
const INVALID_ADDRESS = '0x0000000000000000000000000000000000000000';
const ACCOUNT_ONE_TEXT = 'Solana Account 1';
const INVALID_SOLANA_ADDRESS_TEXT = 'Invalid Solana address';
describe.only(SmokeConfirmations('Send SOL'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it.only('should be able to create a solana account and send SOL to another account', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withDefaultFixture()
          .withSolanaNetwork()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await Assertions.checkIfVisible(WalletView.container);
        await WalletView.tapIdenticon();
        await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapCreateSolanaAccount();
        await Assertions.checkIfTextRegexExists(ACCOUNT_ONE_TEXT, 1);
        await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(1);
        //Assert solana account on main wallet view
        await Assertions.checkIfTextRegexExists(ACCOUNT_ONE_TEXT, 0);

        //Validate invalid address
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSendButton();
        await SendView.inputSolanaAddress(INVALID_ADDRESS);
        await Assertions.checkIfTextRegexExists(INVALID_SOLANA_ADDRESS_TEXT);


        // //Send SOL to another account
        // await TabBarComponent.tapActions();
        // await WalletActionsBottomSheet.tapSendButton();
        // await SendView.inputAddress(VALID_ADDRESS);
        // await SendView.tapNextButton();
        
        // await Assertions.checkIfTextRegexExists('Invalid Solana address');

      },
    );
  });
});
