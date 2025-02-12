import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import { WhatsNewModalSelectorsIDs } from "../../../e2e/selectors/Onboarding/WhatsNewModal.selectors";

class WhatsNewModal {
  get container() {
    return Selectors.getXpathElementByResourceId(WhatsNewModalSelectorsIDs.CONTAINER);
  }

  get closeButton() {
    return Selectors.getXpathElementByResourceId(WhatsNewModalSelectorsIDs.CLOSE_BUTTON);
  }

  async waitForDisplay() {
    const element = await this.container;
    await element.waitForDisplayed();
  }

  async waitForDisappear() {
    const element = await this.container;
    await element.waitForExist({ reverse: true });
  }

  async tapCloseButton() {
    await Gestures.waitAndTap(this.closeButton);
  }
}

export default new WhatsNewModal();
