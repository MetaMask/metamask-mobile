import {
  NetworkEducationModalSelectorsIDs,
  NetworkEducationModalSelectorsText,
} from '../../../app/components/UI/NetworkInfo/NetworkEducationModal.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';

class NetworkEducationModal {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(NetworkEducationModalSelectorsIDs.CONTAINER);
  }

  get closeButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      NetworkEducationModalSelectorsIDs.CLOSE_BUTTON,
    );
  }

  get addToken(): EncapsulatedElementType {
    return Matchers.getElementByText(
      NetworkEducationModalSelectorsText.ADD_TOKEN,
    );
  }

  get networkName(): EncapsulatedElementType {
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
