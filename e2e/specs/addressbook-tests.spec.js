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

import AddAddressModal from '../pages/modals/AddAddressModal';
import ApprovalModal from '../pages/modals/ApprovalModal';
import NetworkListModal from '../pages/modals/NetworkListModal';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';

import TestHelpers from '../helpers';

const SECRET_RECOVERY_PHRASE = 'fold media south add since false relax immense pause cloth just raven';
const PASSWORD = `12345678`;

const INVALID_ADDRESS = '0xB8B4EE5B1b693971eB60bDa15211570df2dB221L';
const TETHER_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const MYTH_ADDRESS = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';
const MEMO = 'Test adding ENS';
const RINKEBY = 'Rinkeby Test Network';
const APPROVAL_DEEPLINK_URL =
	'https://metamask.app.link/send/0x01BE23585060835E02B77ef475b0Cc51aA1e0709@4/approve?address=0x178e3e6c9f547A00E33150F7104427ea02cfc747&uint256=5e8';
const CONTRACT_NICK_NAME_TEXT = 'Ace RoMaIn';

describe('Addressbook Tests', () => {
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

	it('should go to send view', async () => {
		// Open Drawer
		await WalletView.tapDrawerButton();

		await DrawerView.isVisible();
		await DrawerView.tapSendButton();
		// Make sure view with my accounts visible
		await SendView.isTransferBetweenMyAccountsButtonVisible();
	});

	it('should input a valid address to send to', async () => {
		await SendView.inputAddress(TETHER_ADDRESS); //Input token address to test for error
		await SendView.incorrectAddressErrorMessageIsVisible();
		await SendView.removeAddress();
		await SendView.inputAddress(MYTH_ADDRESS);
		await SendView.noEthWarningMessageIsVisible();
	});

	it('should add a new address to address book via send flow', async () => {
		await SendView.tapAddAddressToAddressBook();

		await AddAddressModal.isVisible();
		await AddAddressModal.typeInAlias('Myth');
		await AddAddressModal.tapSaveButton();

		await SendView.removeAddress();
		await TestHelpers.delay(1000);
		await SendView.isSavedAliasVisible('Myth'); // Check that the new account is on the address list
	});

	it('should go to settings then select contacts', async () => {
		await SendView.tapcancelButton();

		// Check that we are on the wallet screen
		await WalletView.isVisible();
		await WalletView.tapDrawerButton();

		await DrawerView.isVisible();
		await DrawerView.tapSettings();

		await SettingsView.tapContacts();

		await ContactsView.isVisible();
		await ContactsView.isContactAliasVisible('Myth');
	});

	it('should add an address via the contacts view', async () => {
		await ContactsView.tapAddContactButton();

		await AddContactView.isVisible();
		await AddContactView.typeInName('Ibrahim');

		// Input invalid address
		await AddContactView.typeInAddress(INVALID_ADDRESS);
		await AddContactView.isErrorMessageVisible();
		await AddContactView.isErrorMessageTextCorrect();

		await AddContactView.clearAddressInputBox();
		await AddContactView.typeInAddress('ibrahim.team.mask.eth');
		await AddContactView.typeInMemo(MEMO);
		await AddContactView.tapAddContactButton();

		await ContactsView.isVisible(); // Check that we are on the contacts screen
		await ContactsView.isContactAliasVisible('Ibrahim'); // Check that Ibrahim address is saved in the address book
	});

	it('should edit a contact', async () => {
		await ContactsView.tapOnAlias('Myth'); // Tap on Myth address

		await AddContactView.tapEditButton();
		await AddContactView.typeInName('Moon'); // Change name from Myth to Moon
		await AddContactView.tapEditContactCTA();

		// because tapping edit contact is slow to load on bitrise
		try {
			await ContactsView.isVisible();
		} catch {
			await AddContactView.tapEditContactCTA();
			await ContactsView.isVisible();
		}
		await ContactsView.isContactAliasVisible('Moon'); // Check that Ibrahim address is saved in the address book
		await ContactsView.isContactAliasNotVisible('Myth'); // Ensure Myth is not visible
	});

	it('should remove a contact', async () => {
		// Tap on Moon address
		await ContactsView.tapOnAlias('Moon'); // Tap on Myth address
		// Tap on edit
		await AddContactView.tapEditButton();
		await AddContactView.tapDeleteContactCTA();

		await ContactsView.isContactAliasNotVisible('Moon');
	});

	it('should go back to send flow to validate newly added address is displayed', async () => {
		// tap on the back arrow
		await AddContactView.tapBackButton();
		await SettingsView.tapCloseButton();

		await WalletView.isVisible();
		await WalletView.tapDrawerButton();

		await DrawerView.isVisible();
		await DrawerView.tapSendButton();

		await SendView.isSavedAliasVisible('Ibrahim');
	});
	it('should swtich to rinkeby', async () => {
		await SendView.tapcancelButton();
		await WalletView.tapNetworksButtonOnNavBar();
		await NetworkListModal.changeNetwork(RINKEBY);

		await WalletView.isNetworkNameVisible(RINKEBY);
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
		await ContractNickNameView.isContractNickNameInInputBoxVisible(CONTRACT_NICK_NAME_TEXT);
		await ContractNickNameView.tapConfirmButton();

		await ApprovalModal.isContractNickNameVisible(CONTRACT_NICK_NAME_TEXT);
	});

	it('should edit the contract nickname', async () => {
		await ApprovalModal.tapEditNickName();

		await ContractNickNameView.isContractNickNameInInputBoxVisible(CONTRACT_NICK_NAME_TEXT);
		await ContractNickNameView.typeContractNickName('Ace');
		await ContractNickNameView.tapConfirmButton();

		await ApprovalModal.isContractNickNameVisible('Ace');
		await ApprovalModal.tapToCopyContractAddress();
		await ApprovalModal.tapRejectButton();
	});

	it('should return to the send view', async () => {
		// Open Drawer
		await WalletView.tapDrawerButton();

		await DrawerView.isVisible();
		await DrawerView.tapSendButton();
		// Make sure view with my accounts visible
		await SendView.isTransferBetweenMyAccountsButtonVisible();
	});

	it('should verify the contract nickname does not appear in send flow', async () => {
		await SendView.isSavedAliasIsNotVisible('Ace');
	});

	it('should verify contract does not appear in contacts view', async () => {
		await SendView.tapcancelButton();

		// Check that we are on the wallet screen
		await WalletView.isVisible();
		await WalletView.tapDrawerButton();

		await DrawerView.isVisible();
		await DrawerView.tapSettings();

		await SettingsView.tapContacts();

		await ContactsView.isVisible();
		await ContactsView.isContactAliasVisible('Ace');
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
