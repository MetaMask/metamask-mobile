import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  NetworkNonPemittedBottomSheetSelectorsIDs,
  NetworkNonPemittedBottomSheetSelectorsText,
} from '../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds';
import { EncapsulatedElementType } from '../../framework';

class NetworkNonPemittedBottomSheet {
  get addThisNetworkTitle(): EncapsulatedElementType {
    return Matchers.getElementByText(
      NetworkNonPemittedBottomSheetSelectorsText.ADD_THIS_NETWORK_TITLE,
    );
  }

  get addThisNetworkButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      NetworkNonPemittedBottomSheetSelectorsIDs.ADD_THIS_NETWORK_BUTTON,
    );
  }

  get chooseFromPermittedNetworksButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      NetworkNonPemittedBottomSheetSelectorsIDs.CHOOSE_FROM_PERMITTED_NETWORKS_BUTTON,
    );
  }

  get editPermissionsButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      NetworkNonPemittedBottomSheetSelectorsIDs.EDIT_PERMISSIONS_BUTTON,
    );
  }

  async tapAddThisNetworkButton(): Promise<void> {
    await Gestures.waitAndTap(this.addThisNetworkButton, {
      elemDescription: 'Add this network button',
    });
  }

  async tapChooseFromPermittedNetworksButton(): Promise<void> {
    await Gestures.waitAndTap(this.chooseFromPermittedNetworksButton, {
      elemDescription: 'Choose from permitted networks button',
    });
  }

  async tapEditPermissionsButton(): Promise<void> {
    await Gestures.waitAndTap(this.editPermissionsButton, {
      elemDescription: 'Edit permissions button',
    });
  }
}

export default new NetworkNonPemittedBottomSheet();
