import { MetaMetricsOptInSelectorsIDs } from "../../e2e/selectors/Onboarding/MetaMetricsOptIn.selectors";
import { CommonScreen } from "./CommonScreen";


export class MetaMetricsScreen extends CommonScreen {

  get iAgreeButton() {
    return MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_I_AGREE_BUTTON_ID
  }

  get noThanksButton() {
    return MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_NO_THANKS_BUTTON_ID
  }

  async tapOnIAgreeButton() {
    await this.tapOnElement(this.iAgreeButton);
  }

  async tapOnNoThanksButton() {
    await this.tapOnElement(this.noThanksButton);
  }
}