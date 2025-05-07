import TestHelpers from '../../helpers';
import OnboardingCarouselView from '../../pages/SeedlessOnboarding/OnboardingCarouselView';
import Assertions from '../../utils/Assertions';
import { Regression } from '../../tags';
import TermsOfUseModal from '../../pages/SeedlessOnboarding/TermsOfUseModal';

describe(Regression('Seedless Onboarding - Term of Use'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should displayed Term of Use when first launching app', async () => {
    await Assertions.checkIfVisible(OnboardingCarouselView.container);
    await OnboardingCarouselView.tapOnGetStartedButton();
    await Assertions.checkIfVisible(TermsOfUseModal.container);
    await Assertions.checkIfVisible(TermsOfUseModal.acceptButton);
    await Assertions.checkIfElementDisabled(TermsOfUseModal.acceptButton);
    await Assertions.checkIfVisible(TermsOfUseModal.scrollArrowButton);
    await Assertions.checkIfVisible(TermsOfUseModal.closeButton);
  });


  it('should close modal when close button is pressed', async () => {
    await TermsOfUseModal.tapCloseButton();
    await Assertions.checkIfNotVisible(TermsOfUseModal.container);
  });

  it('should enabled accept button when scroll to the end and check the checkbox', async () => {
    await OnboardingCarouselView.tapOnGetStartedButton();
    await TermsOfUseModal.tapScrollEndButton();
    await TermsOfUseModal.tapAgreeCheckBox();
    await Assertions.checkIfElementEnabled(TermsOfUseModal.acceptButton);
  });

  it('should react to checkbox change', async () => {
    await TermsOfUseModal.tapAgreeCheckBox();
    await Assertions.checkIfElementDisabled(TermsOfUseModal.acceptButton);
    await TermsOfUseModal.tapAgreeCheckBox();
    await Assertions.checkIfElementEnabled(TermsOfUseModal.acceptButton);
  });

  it('should accept terms of use normally', async () => {
    await TermsOfUseModal.tapAcceptButton();
    await Assertions.checkIfNotVisible(TermsOfUseModal.container);
  });

});
