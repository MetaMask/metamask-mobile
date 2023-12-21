'use strict';
import ImportWalletView from '../../pages/Onboarding/ImportWalletView';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../../pages/Onboarding/OnboardingCarouselView';

import ContractNickNameView from '../../pages/ContractNickNameView';
import SendView from '../../pages/SendView';

import MetaMetricsOptIn from '../../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../../pages/WalletView';
import EnableAutomaticSecurityChecksView from '../../pages/EnableAutomaticSecurityChecksView';
import LoginView from '../../pages/LoginView';

import ContactsView from '../../pages/Drawer/Settings/Contacts/ContactsView';
import SettingsView from '../../pages/Drawer/Settings/SettingsView';

import NetworkListModal from '../../pages/modals/NetworkListModal';
import OnboardingWizardModal from '../../pages/modals/OnboardingWizardModal';
import NetworkEducationModal from '../../pages/modals/NetworkEducationModal';
import WhatsNewModal from '../../pages/modals/WhatsNewModal';
import SecurityAndPrivacy from '../../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';

import TestHelpers from '../../helpers';
import { acceptTermOfUse } from '../../viewHelper';
import Accounts from '../../../wdio/helpers/Accounts';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import ContractApprovalModal from '../../pages/modals/ContractApprovalModal';
import CommonView from '../../pages/CommonView';

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
      await WhatsNewModal.tapCloseButton();
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
    await TestHelpers.delay(3000);
  });

  it('should enable remember me', async () => {
    await expect(await SecurityAndPrivacy.rememberMeToggle).toHaveToggleValue(
      false,
    );
    await SecurityAndPrivacy.tapTurnOnRememberMeToggle();
    await expect(await SecurityAndPrivacy.rememberMeToggle).toHaveToggleValue(
      true,
    );

    await TestHelpers.delay(1500);
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
    await ContractApprovalModal.isVisible();
  });

  it('should add a nickname to the contract', async () => {
    await ContractApprovalModal.tapAddNickName();

    await ContractNickNameView.isVisible();
    await ContractNickNameView.typeContractNickName(CONTRACT_NICK_NAME_TEXT);
    await ContractNickNameView.isContractNickNameInInputBoxVisible(
      CONTRACT_NICK_NAME_TEXT,
    );
    await ContractNickNameView.tapConfirmButton();

    await ContractApprovalModal.isContractNickNameVisible(
      CONTRACT_NICK_NAME_TEXT,
    );
  });

  it('should edit the contract nickname', async () => {
    await ContractApprovalModal.tapEditNickName();

    await ContractNickNameView.isContractNickNameInInputBoxVisible(
      CONTRACT_NICK_NAME_TEXT,
    );
    await ContractNickNameView.clearNickName();
    await ContractNickNameView.typeContractNickName('Ace');
    await ContractNickNameView.tapConfirmButton();

    await ContractApprovalModal.isContractNickNameVisible('Ace');
    await ContractApprovalModal.tapToCopyContractAddress();
    await ContractApprovalModal.tapRejectButton();
  });

  it('should verify contract does not appear in contacts view', async () => {
    // Check that we are on the wallet screen
    await WalletView.isVisible();
    await TabBarComponent.tapSettings();
    await SettingsView.tapContacts();

    await expect(await ContactsView.container).toBeVisible();
    await ContactsView.isContactAliasVisible('Ace');
  });

  it('should return to the send view', async () => {
    // Open Drawer
    await CommonView.tapBackButton();
    await SettingsView.tapCloseButton();

    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSendButton();
    // Make sure view with my accounts visible
    await SendView.isMyAccountsVisible();
  });

  it('should verify the contract nickname does not appear in send flow', async () => {
    await SendView.isSavedAliasIsNotVisible('Ace');
  });

  it('should deep link to the approval modal and approve transaction', async () => {
    await TestHelpers.openDeepLink(APPROVAL_DEEPLINK_URL);
    await TestHelpers.delay(3000);
    await ContractApprovalModal.isVisible();
    await ContractApprovalModal.isContractNickNameVisible('Ace');

    await ContractApprovalModal.tapApproveButton();
    await ContractApprovalModal.isNotVisible();
  });

  it('should go to the send view again', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSendButton();
    // Make sure view with my accounts visible
    await SendView.isMyAccountsVisible();
  });

  it('should verify the contract nickname does not appear in recents', async () => {
    await SendView.isSavedAliasIsNotVisible('Ace');
  });
});
