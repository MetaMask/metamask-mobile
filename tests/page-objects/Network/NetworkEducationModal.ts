import {
  NetworkEducationModalSelectorsIDs,
  NetworkEducationModalSelectorsText,
} from '../../../app/components/UI/NetworkInfo/NetworkEducationModal.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class NetworkEducationModal {
  get container(): DetoxElement {
    return Matchers.getElementByID(NetworkEducationModalSelectorsIDs.CONTAINER);
  }

  get closeButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(NetworkEducationModalSelectorsIDs.CLOSE_BUTTON)
      : Matchers.getElementByLabel(
          NetworkEducationModalSelectorsIDs.CLOSE_BUTTON,
        );
  }

  get addToken(): DetoxElement {
    return Matchers.getElementByText(
      NetworkEducationModalSelectorsText.ADD_TOKEN,
    );
  }

  get networkName(): DetoxElement {
    return Matchers.getElementByID(
      NetworkEducationModalSelectorsIDs.NETWORK_NAME,
    );
  }

  async tapGotItButton(): Promise<void> {
    await Gestures.waitAndTap(this.closeButton, {
      elemDescription: 'Got it button',
    });
  }

  async tapNetworkName(): Promise<void> {
    await Gestures.waitAndTap(this.networkName);
  }
}

export default new NetworkEducationModal();
