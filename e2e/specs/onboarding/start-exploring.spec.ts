import { SmokeWalletPlatform } from '../../tags';
import TestHelpers from '../../helpers';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../../pages/Onboarding/OnboardingCarouselView';
import ProtectYourWalletView from '../../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../../pages/Onboarding/CreatePasswordView';
import OnboardingSuccessView from '../../pages/Onboarding/OnboardingSuccessView';
import SkipAccountSecurityModal from '../../pages/Onboarding/SkipAccountSecurityModal';
import { acceptTermOfUse } from '../../viewHelper';
import Assertions from '../../../tests/framework/Assertions';

const PASSWORD = '12345678';

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(SmokeWalletPlatform('Start Exploring'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should show the onboarding screen', async () => {
    // Check that we are on the onboarding carousel screen
    await Assertions.expectElementToBeVisible(OnboardingCarouselView.container);
    await Assertions.expectElementToBeVisible(OnboardingCarouselView.titleOne);
    await Assertions.expectElementToBeVisible(OnboardingCarouselView.imageOne);
    await OnboardingCarouselView.swipeCarousel();
    await Assertions.expectElementToBeVisible(OnboardingCarouselView.titleTwo);
    await Assertions.expectElementToBeVisible(OnboardingCarouselView.imageTwo);
    await OnboardingCarouselView.swipeCarousel();
    await Assertions.expectElementToBeVisible(
      OnboardingCarouselView.titleThree,
    );
    await Assertions.expectElementToBeVisible(
      OnboardingCarouselView.imageThree,
    );
    await OnboardingCarouselView.tapOnGetStartedButton();
    await acceptTermOfUse();
    await Assertions.expectElementToBeVisible(OnboardingView.container);
  });

  it('should be able to create a new wallet', async () => {
    await CreatePasswordView.tapIUnderstandCheckBox();
    await CreatePasswordView.enterPassword(PASSWORD);
    await CreatePasswordView.reEnterPassword(PASSWORD);
  });

  it('Should skip backup check', async () => {
    // Check that we are on the Secure your wallet screen
    await Assertions.expectElementToBeVisible(ProtectYourWalletView.container);
    await ProtectYourWalletView.tapOnRemindMeLaterButton();
    await SkipAccountSecurityModal.tapIUnderstandCheckBox();
    await SkipAccountSecurityModal.tapSkipButton();
  });

  it('Should skip onboarding success screen', async () => {
    // Press Done on the Onboarding Success screen
    await OnboardingSuccessView.tapDone();
  });
});
