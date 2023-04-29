import Selectors from '../../helpers/Selectors';
import {
  DELETE_CONTACT_MODAL_CANCEL_BUTTON,
  DELETE_CONTACT_MODAL_DELETE_BUTTON,
  DELETE_CONTACT_MODAL_TITLE,
} from '../testIDs/Components/DeleteContactModal.testIds';
import Gestures from '../../helpers/Gestures';

class DeleteContactModal {
  get title() {
    return Selectors.getXpathElementByText(DELETE_CONTACT_MODAL_TITLE);
  }

  get deleteButton() {
    return Selectors.getXpathElementByText(DELETE_CONTACT_MODAL_DELETE_BUTTON);
  }

  get cancelButton() {
    return Selectors.getXpathElementByText(DELETE_CONTACT_MODAL_CANCEL_BUTTON);
  }

  async waitForTitle() {
    const title = await this.title;
    await title.waitForDisplayed();
  }

  async tapDeleteButton() {
    await Gestures.waitAndTap(this.deleteButton);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }
}

export default new DeleteContactModal();
