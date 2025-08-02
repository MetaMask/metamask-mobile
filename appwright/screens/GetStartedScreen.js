import Selectors from "../../wdio/helpers/Selectors"
import { OnboardingCarouselSelectorIDs } from "../../e2e/selectors/Onboarding/OnboardingCarousel.selectors";
import { CommonScreen } from "./CommonScreen";


export class GetStartedScreen extends CommonScreen {

  // Locators
  get getStartedButton() {
    return OnboardingCarouselSelectorIDs.GET_STARTED_BUTTON_ID
  }

  async tapOnGetStartedButton() {
    await this.tapOnElement(this.getStartedButton);
  }
}