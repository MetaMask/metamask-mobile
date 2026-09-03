import {
  NetworkEducationModalSelectorsIDs,
  NetworkEducationModalSelectorsText,
} from '../../../app/components/UI/NetworkInfo/NetworkEducationModal.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import type { AppiumElement } from '../../framework/AppiumElement';

class NetworkEducationModal {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(NetworkEducationModalSelectorsIDs.CONTAINER);
  }

  get closeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      NetworkEducationModalSelectorsIDs.CLOSE_BUTTON,
    );
  }

  get addToken(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      NetworkEducationModalSelectorsText.ADD_TOKEN,
    );
  }

  get networkName(): Promise<AppiumElement> {
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
    await Gestures.waitAndTap(this.networkName, {
      elemDescription: 'Network name',
    });
  }
}

export default new NetworkEducationModal();
