import { PermissionSummaryBottomSheetSelectorsIDs } from '../../selectors/Browser/PermissionSummaryBottomSheet.selectors';
import Matchers from '../../utils/Matchers';
// import Gestures from '../../utils/Gestures';

class PermissionSummaryBottomSheet {
  get container() {
    return Matchers.getElementByID(
      PermissionSummaryBottomSheetSelectorsIDs.CONTAINER,
    );
  }
}

export default new PermissionSummaryBottomSheet();
