'use strict';
import { SmokeAccounts } from '../../../tags';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import {
  defaultGanacheOptions,
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../../fixtures/fixture-helper';
import FixtureServer from '../../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../../fixtures/utils';
import WalletView from '../../../pages/wallet/WalletView';
import { loginToApp } from '../../../viewHelper';
import Assertions from '../../../utils/Assertions';
import TestHelpers from '../../../helpers';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import SRPListItemComponent from '../../../pages/wallet/MultiSrp/Common/SRPListItemComponent';
import AccountActionsBottomSheet from '../../../pages/wallet/AccountActionsBottomSheet';
import SrpQuizModal from '../../../pages/Settings/SecurityAndPrivacy/SrpQuizModal';
import RevealSecretRecoveryPhrase from '../../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import { RevealSeedViewSelectorsText } from '../../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import SettingsView from '../../../pages/Settings/SettingsView';
import SecurityAndPrivacyView from '../../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';

const fixtureServer = new FixtureServer();

const FIRST_DEFAULT_HD_KEYRING_ACCOUNT = 0;
const FIRST_IMPORTED_HD_KEYRING_ACCOUNT = 2;

const PASSWORD = '123123123';
const DEFAULT_SRP = defaultGanacheOptions.mnemonic;
const IMPORTED_SRP =
  'lazy youth dentist air relief leave neither liquid belt aspect bone frame';

const goToAccountActions = async (accountIndex) => {
  await WalletView.tapIdenticon();
  await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
  await AccountListBottomSheet.tapEditAccountActionsAtIndex(accountIndex);
  await AccountActionsBottomSheet.tapShowSRP();
};

const completeSrpQuiz = async (expectedSrp) => {
  await SrpQuizModal.tapGetStartedButton();
  await SrpQuizModal.tapQuestionRightAnswerButton(1);
  await SrpQuizModal.tapQuestionContinueButton(1);
  await SrpQuizModal.tapQuestionRightAnswerButton(2);
  await SrpQuizModal.tapQuestionContinueButton(2);
  await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
    PASSWORD,
  );
  await RevealSecretRecoveryPhrase.tapToReveal();
  await Assertions.checkIfVisible(RevealSecretRecoveryPhrase.container);
  await Assertions.checkIfTextIsDisplayed(
    RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_SRP_TITLE_TEXT,
  );
  await Assertions.checkIfTextIsDisplayed(expectedSrp);
  await RevealSecretRecoveryPhrase.tapDoneButton();
};

describe(
  SmokeAccounts('Multi-SRP: Exports the correct srp in account actions'),
  () => {
    beforeAll(async () => {
      await TestHelpers.reverseServerPort();
      const fixture = new FixtureBuilder()
        .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
        .build();
      await startFixtureServer(fixtureServer);
      await loadFixture(fixtureServer, { fixture });
      await TestHelpers.launchApp({
        launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
      });
      await loginToApp();
    });

    afterAll(async () => {
      await stopFixtureServer(fixtureServer);
    });

    it('exports the correct srp for the default hd keyring', async () => {
      await goToAccountActions(FIRST_DEFAULT_HD_KEYRING_ACCOUNT);
      await completeSrpQuiz(DEFAULT_SRP);
    });

    it('exports the correct srp for the imported hd keyring', async () => {
      await goToAccountActions(FIRST_IMPORTED_HD_KEYRING_ACCOUNT);
      await completeSrpQuiz(IMPORTED_SRP);
    });
  },
);
