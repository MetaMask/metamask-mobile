import {
  NetworkEducationModalSelectorsIDs,
  NetworkEducationModalSelectorsText,
} from '../../selectors/Network/NetworkEducationModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class NetworkEducationModal {
  get container() {
    return Matchers.getElementByID(NetworkEducationModalSelectorsIDs.CONTAINER);
  }

  get closeButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(NetworkEducationModalSelectorsIDs.CLOSE_BUTTON)
      : Matchers.getElementByLabel(
          NetworkEducationModalSelectorsIDs.CLOSE_BUTTON,
        );
  }

  get addToken() {
    return Matchers.getElementByText(
      NetworkEducationModalSelectorsText.ADD_TOKEN,
    );
  }

  get networkName() {
    return Matchers.getElementByID(
      NetworkEducationModalSelectorsIDs.NETWORK_NAME,
    );
  }

  async tapGotItButton() {
    await Gestures.waitAndTap(this.closeButton);
  }
}

export default new NetworkEducationModal();
