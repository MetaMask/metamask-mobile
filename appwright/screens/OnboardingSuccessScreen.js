import Selectors from "../../wdio/helpers/Selectors"
import { OnboardingSuccessSelectorIDs } from '../../e2e/selectors/Onboarding/OnboardingSuccess.selectors';
import { CommonScreen } from "./CommonScreen";

export class OnboardingSuccessScreen extends CommonScreen {

  get doneButton() {
    return OnboardingSuccessSelectorIDs.DONE_BUTTON
  }

  async tapOnDoneButton() {
    await this.tapOnElement(this.doneButton);
  }
}