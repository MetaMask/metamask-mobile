'use strict';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';
import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';

import ContractNickNameView from '../pages/ContractNickNameView';
import SendView from '../pages/SendView';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';
import LoginView from '../pages/LoginView';

import AddContactView from '../pages/Drawer/Settings/Contacts/AddContactView';
import ContactsView from '../pages/Drawer/Settings/Contacts/ContactsView';
import SettingsView from '../pages/Drawer/Settings/SettingsView';

import ApprovalModal from '../pages/modals/ApprovalModal';
import NetworkListModal from '../pages/modals/NetworkListModal';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import NetworkEducationModal from '../pages/modals/NetworkEducationModal';
import WhatsNewModal from '../pages/modals/WhatsNewModal';
import SecurityAndPrivacy from '../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';

import TestHelpers from '../helpers';
import { acceptTermOfUse } from '../viewHelper';
import Accounts from '../../wdio/helpers/Accounts';
import TabBarComponent from '../pages/TabBarComponent';
import WalletActionsModal from '../pages/modals/WalletActionsModal';

describe('Adding Contract Nickname', () => {
  const APPROVAL_DEEPLINK_URL =
    'https://metamask.app.link/send/0x326C977E6efc84E512bB9C30f76E30c160eD06FB@5/approve?address=0x178e3e6c9f547A00E33150F7104427ea02cfc747&uint256=5e8';
  const CONTRACT_NICK_NAME_TEXT = 'Ace RoMaIn';
  const GOERLI = 'Goerli Test Network';

  //FIXME Deep linking to a contract address does not work on a sim.

  let validAccount;

  beforeAll(() => {
    validAccount = Accounts.getValidAccount();
  });

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should import via seed phrase and validate in settings', async () => {
    await OnboardingCarouselView.isVisible();
    await OnboardingCarouselView.tapOnGetStartedButton();

    await OnboardingView.isVisible();
    await OnboardingView.tapImportWalletFromSeedPhrase();

    await MetaMetricsOptIn.isVisible();
    await MetaMetricsOptIn.tapAgreeButton();

    await acceptTermOfUse();
    await ImportWalletView.isVisible();
  });

  it('should attempt to import wallet with invalid secret recovery phrase', async () => {
    await ImportWalletView.enterSecretRecoveryPhrase(validAccount.seedPhrase);
    await ImportWalletView.enterPassword(validAccount.password);
    await ImportWalletView.reEnterPassword(validAccount.password);
    await WalletView.isVisible();
  });

  it('Should dismiss Automatic Security checks screen', async () => {
    await TestHelpers.delay(3500);
    await EnableAutomaticSecurityChecksView.isVisible();
    await EnableAutomaticSecurityChecksView.tapNoThanks();
  });

  it('should dismiss the onboarding wizard', async () => {
    // dealing with flakiness on bitrise.
    await TestHelpers.delay(1000);
    try {
      await OnboardingWizardModal.isVisible();
      await OnboardingWizardModal.tapNoThanksButton();
      await OnboardingWizardModal.isNotVisible();
    } catch {
      //
    }
  });

  it('should tap on "Got it" Button in the whats new modal', async () => {
    // dealing with flakiness on bitrise.
    await TestHelpers.delay(2500);
    try {
      await WhatsNewModal.isVisible();
      await WhatsNewModal.tapGotItButton();
    } catch {
      //
    }
  });

  it('should switch to GOERLI', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.changeNetwork(GOERLI);

    await WalletView.isNetworkNameVisible(GOERLI);
    await TestHelpers.delay(1500);
  });

  it('should dismiss network education modal', async () => {
    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
  });
  it('should go to the Privacy and settings view', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapSecurityAndPrivacy();

    await SecurityAndPrivacy.scrollToTurnOnRememberMe();
    TestHelpers.delay(3000);
  });

  it('should enable remember me', async () => {
    await SecurityAndPrivacy.isRememberMeToggleOff();
    await SecurityAndPrivacy.tapTurnOnRememberMeToggle();
    await SecurityAndPrivacy.isRememberMeToggleOn();

    TestHelpers.delay(1500);
  });

  it('should relaunch the app then enable remember me', async () => {
    // Relaunch app
    await TestHelpers.relaunchApp();
    await LoginView.isVisible();
    await LoginView.toggleRememberMe();

    await LoginView.enterPassword(validAccount.password);
    await WalletView.isVisible();
  });
  it('should deep link to the approval modal', async () => {
    await TestHelpers.openDeepLink(APPROVAL_DEEPLINK_URL);
    await TestHelpers.delay(3000);
    await ApprovalModal.isVisible();
  });

  it('should add a nickname to the contract', async () => {
    await ApprovalModal.tapAddNickName();

    await ContractNickNameView.isVisible();
    await ContractNickNameView.typeContractNickName(CONTRACT_NICK_NAME_TEXT);
    await ContractNickNameView.isContractNickNameInInputBoxVisible(
      CONTRACT_NICK_NAME_TEXT,
    );
    await ContractNickNameView.tapConfirmButton();

    await ApprovalModal.isContractNickNameVisible(CONTRACT_NICK_NAME_TEXT);
  });

  it('should edit the contract nickname', async () => {
    await ApprovalModal.tapEditNickName();

    await ContractNickNameView.isContractNickNameInInputBoxVisible(
      CONTRACT_NICK_NAME_TEXT,
    );
    await ContractNickNameView.clearNickName();
    await ContractNickNameView.typeContractNickName('Ace');
    await ContractNickNameView.tapConfirmButton();

    await ApprovalModal.isContractNickNameVisible('Ace');
    await ApprovalModal.tapToCopyContractAddress();
    await ApprovalModal.tapRejectButton();
  });

  it('should verify contract does not appear in contacts view', async () => {
    // Check that we are on the wallet screen
    await WalletView.isVisible();
    await TabBarComponent.tapSettings();
    await SettingsView.tapContacts();

    await ContactsView.isVisible();
    await ContactsView.isContactAliasVisible('Ace');
  });

  it('should return to the send view', async () => {
    // Open Drawer
    await AddContactView.tapBackButton();
    await SettingsView.tapCloseButton();

    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSendButton();
    // Make sure view with my accounts visible
    await SendView.isMyAccountsVisisble();
  });

  it('should verify the contract nickname does not appear in send flow', async () => {
    await SendView.isSavedAliasIsNotVisible('Ace');
  });

  it('should deep link to the approval modal and approve transaction', async () => {
    await TestHelpers.openDeepLink(APPROVAL_DEEPLINK_URL);
    await TestHelpers.delay(3000);
    await ApprovalModal.isVisible();
    await ApprovalModal.isContractNickNameVisible('Ace');

    await ApprovalModal.tapApproveButton();
    await ApprovalModal.isNotVisible();
  });

  it('should go to the send view again', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSendButton();
    // Make sure view with my accounts visible
    await SendView.isMyAccountsVisisble();
  });

  it('should verify the contract nickname does not appear in recents', async () => {
    await SendView.isSavedAliasIsNotVisible('Ace');
  });
});
