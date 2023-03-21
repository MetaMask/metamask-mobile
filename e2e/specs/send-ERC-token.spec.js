'use strict';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';
import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';

import TestHelpers from '../helpers';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import DrawerView from '../pages/Drawer/DrawerView';
import SettingsView from '../pages/Drawer/Settings/SettingsView';
import NetworkView from '../pages/Drawer/Settings/NetworksView';
import NetworkEducationModal from '../pages/modals/NetworkEducationModal';
import AddCustomTokenView from '../pages/AddCustomTokenView';
import SendView from '../pages/SendView';
import AmountView from '../pages/AmountView';
import ConfirmView from '../pages/ConfirmView.js';
import Accounts from '../../wdio/helpers/Accounts';
import { acceptTermOfUse } from '../viewHelper';

const AVAX_URL = 'https://api.avax-test.network/ext/C/rpc';
const TOKEN_ADDRESS = '0x5425890298aed601595a70AB815c96711a31Bc65';
const SEND_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe('Send ERC Token', () => {
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

  it('should import wallet with valid secret recovery phrase', async () => {
    await ImportWalletView.enterSecretRecoveryPhrase(validAccount.seedPhrase);
    await ImportWalletView.enterPassword(validAccount.password);
    await ImportWalletView.reEnterPassword(validAccount.password);
    // await TestHelpers.delay(3500);
    await EnableAutomaticSecurityChecksView.isVisible();
    await EnableAutomaticSecurityChecksView.tapNoThanks();
    await WalletView.isVisible();
    await TestHelpers.delay(500);
    await OnboardingWizardModal.isVisible();
    await OnboardingWizardModal.tapNoThanksButton();
    await OnboardingWizardModal.isNotVisible();
  });

  it('should add AVAX testnet to my networks list', async () => {
    await WalletView.tapDrawerButton(); // tapping burger menu
    await DrawerView.isVisible();
    await DrawerView.tapSettings();

    await SettingsView.tapNetworks();

    await NetworkView.isNetworkViewVisible();

    await TestHelpers.delay(3000);
    await NetworkView.tapAddNetworkButton();
    await NetworkView.switchToCustomNetworks();

    await NetworkView.typeInNetworkName('AVAX Fuji');
    await NetworkView.clearRpcInputBox();
    await NetworkView.typeInRpcUrl(AVAX_URL);
    await NetworkView.typeInChainId('43113');
    await NetworkView.typeInNetworkSymbol('AVAX\n');

    await NetworkView.swipeToRPCTitleAndDismissKeyboard(); // Focus outside of text input field
    await NetworkView.tapRpcNetworkAddButton();

    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible('AVAX Fuji');
    await NetworkEducationModal.tapGotItButton();
  });

  it('should Import custom AVAX token ', async () => {
    await WalletView.isVisible();
    await WalletView.tapImportTokensButton();
    await AddCustomTokenView.pasteTokenAddress(TOKEN_ADDRESS);
    await AddCustomTokenView.scrollDownOnImportCustomTokens();
    await TestHelpers.delay(2000);
    await AddCustomTokenView.tapTokenSymbolText();
    await AddCustomTokenView.tapImportButton();
  });

  it('should send token to address via the Send view', async () => {
    await WalletView.tapSendIcon(); // tapping burger menu
    await SendView.inputAddress(SEND_ADDRESS);
    await TestHelpers.delay(1000);
    await SendView.tapNextButton();
    await AmountView.typeInTransactionAmount('0.000001');
    await AmountView.tapNextButton();
    await ConfirmView.isAmountVisible('< 0.00001 AVAX');
    await ConfirmView.tapSendButton();
  });

  it('should send token to address via Token Overview screen', async () => {
    // Navigate back to main wallet view and tap on Token
    await WalletView.tapOnToken('AVAX'); // tapping burger menu
    await TestHelpers.waitAndTap('token-send-button');
    await SendView.inputAddress(SEND_ADDRESS);
    await TestHelpers.delay(1000);
    await SendView.tapNextButton();
    await AmountView.typeInTransactionAmount('0.000001');
    await AmountView.tapNextButton();
    await ConfirmView.isAmountVisible('< 0.00001 AVAX');
    await ConfirmView.tapSendButton();
  });
});
