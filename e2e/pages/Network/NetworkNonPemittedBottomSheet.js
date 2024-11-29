import {
  NetworkListModalSelectorsIDs,
  NetworkListModalSelectorsText,
} from '../../selectors/Network/NetworkListModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import {
  NetworkNonPemittedBottomSheetSelectorsIDs,
  NetworkNonPemittedBottomSheetSelectorsText,
} from '../../selectors/Network/NetworkNonPemittedBottomSheet.selectors';

class NetworkNonPemittedBottomSheet {
  get addThisNetworkTitle() {
    return Matchers.getElementByText(
      NetworkNonPemittedBottomSheetSelectorsText.ADD_THIS_NETWORK_TITLE,
    );
  }

  get addThisNetworkButton() {
    return Matchers.getElementByID(
      NetworkNonPemittedBottomSheetSelectorsIDs.ADD_THIS_NETWORK_BUTTON,
    );
  }

  async tapAddThisNetworkButton() {
    await Gestures.waitAndTap(this.addThisNetworkButton);
  }
}

export default new NetworkNonPemittedBottomSheet();
