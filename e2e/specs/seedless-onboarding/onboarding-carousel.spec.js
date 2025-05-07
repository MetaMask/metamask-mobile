import TestHelpers from '../../helpers';
import OnboardingCarouselView from '../../pages/SeedlessOnboarding/OnboardingCarouselView';
import Assertions from '../../utils/Assertions';
import { Regression } from '../../tags';

describe(Regression('Seedless Onboarding'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should displayed Welcome screen', async () => {
    await Assertions.checkIfVisible(OnboardingCarouselView.container);
    await Assertions.checkIfVisible(OnboardingCarouselView.titleOne);
    await Assertions.checkIfVisible(OnboardingCarouselView.imageOne);
  });

  it('should see bottom button enabled', async () => {
    await Assertions.checkIfVisible(OnboardingCarouselView.getStartedButton);
    await Assertions.checkIfElementEnabled(OnboardingCarouselView.getStartedButton);
  });

  it('should swipe screens and see all correct texts', async () => {
    await OnboardingCarouselView.swipeCarousel();
    await Assertions.checkIfVisible(OnboardingCarouselView.titleTwo);
    await Assertions.checkIfVisible(OnboardingCarouselView.imageTwo);
    await OnboardingCarouselView.swipeCarousel();
    await Assertions.checkIfVisible(OnboardingCarouselView.titleThree);
    await Assertions.checkIfVisible(OnboardingCarouselView.imageThree);
    await OnboardingCarouselView.swipeCarousel('right');
    await Assertions.checkIfVisible(OnboardingCarouselView.titleTwo);
    await Assertions.checkIfVisible(OnboardingCarouselView.imageTwo);
  });

});
