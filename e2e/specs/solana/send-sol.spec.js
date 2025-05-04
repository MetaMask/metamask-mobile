'use strict';
import { SmokeConfirmations } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import AmountView from '../../pages/Send/AmountView';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import Assertions from '../../utils/Assertions';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import Gestures from '../../utils/Gestures';
import AccountActionsBottomSheet from '../../pages/wallet/AccountActionsBottomSheet';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import RevealPrivateKey from '../../pages/Settings/SecurityAndPrivacy/RevealPrivateKeyView.js';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import SolanaNewFeatureSheet from '../../pages/wallet/SolanaNewFeatureSheet';
import AddNewHdAccountComponent from '../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import EditAccountNameView from '../../pages/wallet/EditAccountNameView';

const ACCOUNT_ONE_TEXT = 'Solana Account 1';
const ACCOUNT_TWO_TEXT = 'Solana Account 2';
const NEW_ACCOUNT_NAME = 'Solana Account New Name';
const PASSWORD = '123123123';


describe(SmokeConfirmations('Create Solana account'), () => {


  it('should assert the new Solanafeature announcement sheet', async () => {
    await Assertions.checkIfVisible(
      SolanaNewFeatureSheet.verifySheetIsVisible(),
    );
    await Assertions.checkIfVisible(
      SolanaNewFeatureSheet.verifyLearnMoreButtonIsVisible(),
    );
    await Assertions.checkIfVisible(
      SolanaNewFeatureSheet.verifyAddAccountButtonIsVisible(),
    );
    await Assertions.checkIfVisible(
      SolanaNewFeatureSheet.verifyCreateAccountButtonIsVisible(),
    );
  });

});
