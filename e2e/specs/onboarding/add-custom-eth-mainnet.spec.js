import { Regression } from '../../tags';
import OnboardingCarouselView from '../../pages/Onboarding/OnboardingCarouselView';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import Assertions from '../../utils/Assertions';
import MetaMetricsOptIn from '../../pages/Onboarding/MetaMetricsOptInView';
import DefaultNetworkView from '../../pages/Onboarding/DefaultNetworkView';
import TermsOfUseModal from '../../pages/modals/TermsOfUseModal';
import CreatePasswordView from '../../pages/Onboarding/CreatePasswordView';
import EnableAutomaticSecurityChecksView from '../../pages/EnableAutomaticSecurityChecksView';
import SkipAccountSecurityModal from '../../pages/modals/SkipAccountSecurityModal';
import WalletView from '../../pages/WalletView';
import ProtectYourWalletView from '../../pages/Onboarding/ProtectYourWalletView';

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
    await DefaultNetworkView.typeRpcURL('not a valid URL');
    await Assertions.checkIfVisible(DefaultNetworkView.invalidRPCLabel);
  });

  it('should edit default ETH Mainnet with valid RPC', async () => {
    await DefaultNetworkView.typeRpcURL('https://eth.llamarpc.com');
    await DefaultNetworkView.tapUseThisNetworkButton();
    await Assertions.checkIfVisible(MetaMetricsOptIn.container);
  });

  it('should show custom default ETH Mainnet as active', async () => {
    await MetaMetricsOptIn.tapAgreeButton();
    await TermsOfUseModal.tapScrollEndButton();
    await TermsOfUseModal.tapAgreeCheckBox();
    await TermsOfUseModal.tapAcceptButton();
    await CreatePasswordView.enterPassword('Autop@ss1');
    await CreatePasswordView.reEnterPassword('Autop@ss1');
    await CreatePasswordView.tapIUnderstandCheckBox();
    await CreatePasswordView.tapCreatePasswordButton();
    await ProtectYourWalletView.tapOnRemindMeLaterButton();
    await SkipAccountSecurityModal.tapIUnderstandCheckBox();
    await SkipAccountSecurityModal.tapSkipButton();
    await EnableAutomaticSecurityChecksView.tapNoThanks();
    await WalletView.isNetworkNameVisible('Ethereum Main Custom');
  });
});
