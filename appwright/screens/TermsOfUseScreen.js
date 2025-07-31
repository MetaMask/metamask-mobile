import { expect } from "appwright";
import { TermsOfUseModalSelectorsIDs } from "../../e2e/selectors/Onboarding/TermsOfUseModal.selectors";
import { CommonScreen } from "./CommonScreen";

export class TermsOfUseScreen extends CommonScreen {

  get container() {
    return TermsOfUseModalSelectorsIDs.CONTAINER;
  }

  get checkbox() {
    return TermsOfUseModalSelectorsIDs.CHECKBOX;
  }

  get scrollEndArrowButton() {
    return TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON
  }

  get acceptButton() {
    return TermsOfUseModalSelectorsIDs.ACCEPT_BUTTON;
  }

  get webview() {
    return TermsOfUseModalSelectorsIDs.WEBVIEW;
  }

  async isDisplayed() {
    await this.isElementByIdVisible(this.container);
  }

  async tapOnAggreeCheckBox() {
    await this.tapOnElement(this.checkbox);
  }

  async tapOnScrollEndArrowButton() {
    await this.tapOnElement(this.scrollEndArrowButton);
  }

  async tapOnAcceptButton() {
    await this.tapOnElement(this.acceptButton);
  }
}