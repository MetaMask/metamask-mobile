'use strict';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';
import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';

import ContractNickNameView from '../pages/ContractNickNameView';
import SendView from '../pages/SendView';

import DrawerView from '../pages/Drawer/DrawerView';
import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';

import AddContactView from '../pages/Drawer/Settings/Contacts/AddContactView';
import ContactsView from '../pages/Drawer/Settings/Contacts/ContactsView';
import SettingsView from '../pages/Drawer/Settings/SettingsView';

import ApprovalModal from '../pages/modals/ApprovalModal';
import NetworkListModal from '../pages/modals/NetworkListModal';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import NetworkEducationModal from '../pages/modals/NetworkEducationModal';

import TestHelpers from '../helpers';

const SECRET_RECOVERY_PHRASE =
  'fold media south add since false relax immense pause cloth just raven';
const PASSWORD = `12345678`;
const RINKEBY = 'Rinkeby Test Network';
const APPROVAL_DEEPLINK_URL =
  'https://metamask.app.link/send/0x01BE23585060835E02B77ef475b0Cc51aA1e0709@4/approve?address=0x178e3e6c9f547A00E33150F7104427ea02cfc747&uint256=5e8';
const CONTRACT_NICK_NAME_TEXT = 'Ace RoMaIn';

describe('Adding Contract Nickname', () => {
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

    await ImportWalletView.isVisible();
  });

  it('should attempt to import wallet with invalid secret recovery phrase', async () => {
    await ImportWalletView.toggleRememberMe();
    await ImportWalletView.enterSecretRecoveryPhrase(SECRET_RECOVERY_PHRASE);
    await ImportWalletView.enterPassword(PASSWORD);
    await ImportWalletView.reEnterPassword(PASSWORD);
    await WalletView.isVisible();
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

  it('should switch to rinkeby', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.changeNetwork(RINKEBY);

    await WalletView.isNetworkNameVisible(RINKEBY);
    await TestHelpers.delay(1500);
  });

  it('should dismiss network education modal', async () => {
    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
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
    await WalletView.tapDrawerButton();

    await DrawerView.isVisible();
    await DrawerView.tapSettings();

    await SettingsView.tapContacts();

    await ContactsView.isVisible();
    await ContactsView.isContactAliasVisible('Ace');
  });

  it('should return to the send view', async () => {
    // Open Drawer
    await AddContactView.tapBackButton();
    await SettingsView.tapCloseButton();

    await WalletView.tapDrawerButton();

    await DrawerView.isVisible();
    await DrawerView.tapSendButton();
    // Make sure view with my accounts visible
    await SendView.isTransferBetweenMyAccountsButtonVisible();
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
    // Open Drawer
    await WalletView.tapDrawerButton();

    await DrawerView.isVisible();
    await DrawerView.tapSendButton();
    // Make sure view with my accounts visible
    await SendView.isTransferBetweenMyAccountsButtonVisible();
  });

  it('should verify the contract nickname does not appear in recents', async () => {
    await SendView.isSavedAliasIsNotVisible('Ace');
  });
});
