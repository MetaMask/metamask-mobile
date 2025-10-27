import { ManualBackUpStepsSelectorsIDs } from '../../selectors/Onboarding/ManualBackUpSteps.selectors';
import Matchers from '../../framework/Matchers';

class ManualBackupStep1View {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      ManualBackUpStepsSelectorsIDs.STEP_1_CONTAINER,
    );
  }
}

export default new ManualBackupStep1View();
