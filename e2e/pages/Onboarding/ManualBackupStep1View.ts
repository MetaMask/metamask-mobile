import { ManualBackUpStepsSelectorsIDs } from '../../selectors/Onboarding/ManualBackUpSteps.selectors';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';

class ManualBackupStep1View {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      ManualBackUpStepsSelectorsIDs.STEP_1_CONTAINER,
    );
  }

  async isVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Manual Backup Step 1 View should be visible',
    });
  }
}

export default new ManualBackupStep1View();
