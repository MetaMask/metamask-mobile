import { Regression } from '../../tags';
import OnboardingCarouselView from '../../pages/Onboarding/OnboardingCarouselView';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import Assertions from '../../utils/Assertions';
import MetaMetricsOptIn from '../../pages/Onboarding/MetaMetricsOptInView';
import DefaultNetworkView from '../../pages/Onboarding/DefaultNetworkView';
import TermsOfUseModal from '../../pages/modals/TermsOfUseModal';
import CreatePasswordView from '../../pages/Onboarding/CreatePasswordView';
import OnboardingSuccessView from '../../pages/Onboarding/OnboardingSuccessView';
import EnableAutomaticSecurityChecksView from '../../pages/EnableAutomaticSecurityChecksView';
import SkipAccountSecurityModal from '../../pages/modals/SkipAccountSecurityModal';
import WalletView from '../../pages/WalletView';
import ProtectYourWalletView from '../../pages/Onboarding/ProtectYourWalletView';
import NetworksView from '../../pages/Settings/NetworksView';
import Accounts from '../../../wdio/helpers/Accounts';
import { CustomNetworks } from '../../resources/networks.e2e';
import TabBarComponent from '../../pages/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import OnboardingWizardModal from '../../pages/modals/OnboardingWizardModal';
import ProtectYourWalletModal from '../../pages/modals/ProtectYourWalletModal';
import WhatsNewModal from '../../pages/modals/WhatsNewModal';
import TestHelpers from '../../helpers';
import ExperienceEnhancerModal from '../../pages/modals/ExperienceEnhancerModal';

const validAccount = Accounts.getValidAccount();

describe(Regression('Add custom default ETH Mainnet'), () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should navigate to edit custom default ETH Mainnet from Opt-In screen', async () => {
    await OnboardingCarouselView.tapOnGetStartedButton();
    await OnboardingView.tapCreateWallet();
    await Assertions.checkIfVisible(MetaMetricsOptIn.container);
  });

  it('should not edit default network with invalid RPC', async () => {
    await MetaMetricsOptIn.tapEditDefaultNetworkHere();
    await DefaultNetworkView.typeRpcURL(
      CustomNetworks.EthereumMainCustom.providerConfig.rpcUrlInvalid,
    );
    await Assertions.checkIfVisible(NetworksView.rpcWarningBanner);
  });

  it('should edit default ETH Mainnet with valid RPC', async () => {
    await DefaultNetworkView.typeRpcURL(
      CustomNetworks.EthereumMainCustom.providerConfig.rpcUrl,
    );
    await DefaultNetworkView.tapUseThisNetworkButton();
    await Assertions.checkIfVisible(MetaMetricsOptIn.container);
  });

  it('should complete creating wallet', async () => {
    await MetaMetricsOptIn.tapAgreeButton();
    await TermsOfUseModal.tapScrollEndButton();
    await TermsOfUseModal.tapAgreeCheckBox();
    await TermsOfUseModal.tapAcceptButton();
    await CreatePasswordView.enterPassword(validAccount.password);
    await CreatePasswordView.reEnterPassword(validAccount.password);
    await CreatePasswordView.tapIUnderstandCheckBox();
    await CreatePasswordView.tapCreatePasswordButton();
    await ProtectYourWalletView.tapOnRemindMeLaterButton();
    await SkipAccountSecurityModal.tapIUnderstandCheckBox();
    await SkipAccountSecurityModal.tapSkipButton();
    await OnboardingSuccessView.tapDone();
    await EnableAutomaticSecurityChecksView.tapNoThanks();
    await OnboardingWizardModal.tapNoThanksButton();
    await ExperienceEnhancerModal.tapIagree();
  });

  it('should show custom default ETH Mainnet as active', async () => {
    await WalletView.isNetworkNameVisible(
      CustomNetworks.EthereumMainCustom.providerConfig.nickname,
    );
  });

  it('should tap to close the whats new modal if displayed', async () => {
    // dealing with flakiness on bitrise.
    await TestHelpers.delay(2500);
    try {
      await Assertions.checkIfVisible(WhatsNewModal.container);
      await WhatsNewModal.tapCloseButton();
    } catch {
      //
    }
  });

  it('should navigate to Settings > Networks', async () => {
    await Assertions.checkIfVisible(ProtectYourWalletModal.collapseWalletModal);
    await ProtectYourWalletModal.tapRemindMeLaterButton();
    await SkipAccountSecurityModal.tapIUnderstandCheckBox();
    await SkipAccountSecurityModal.tapSkipButton();
    await TabBarComponent.tapSettings();
    await SettingsView.scrollToContactSupportButton();
    await SettingsView.tapNetworks();
    await Assertions.checkIfVisible(NetworksView.networkContainer);
  });

  it('should edit custom default mainnet and land on Wallet view', async () => {
    await NetworksView.tapNetworkByName(
      CustomNetworks.EthereumMainCustom.providerConfig.nickname,
    );
    await NetworksView.clearRpcInputBox();
    await NetworksView.typeInRpcUrl(
      CustomNetworks.EthereumMainCustom.providerConfig.rpcUrlAlt,
    );
    await NetworksView.tapSave();
    await WalletView.isConnectedNetwork(
      CustomNetworks.EthereumMainCustom.providerConfig.nickname,
    );
  });

  it('should show Ethereum Main Custom on added network list', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.changeNetworkTo(
      CustomNetworks.EthereumMainCustom.providerConfig.nickname,
      true, //setting this made this step work for iOS
    );
    await WalletView.isConnectedNetwork(
      CustomNetworks.EthereumMainCustom.providerConfig.nickname,
    );
  });
});
