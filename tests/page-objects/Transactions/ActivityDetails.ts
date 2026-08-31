import { ActivityDetailsSelectorsIDs } from '../../../app/components/Views/ActivityDetails/ActivityDetails.testIds';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import { EncapsulatedElementType } from '../../framework';

class ActivityDetails {
  get screen(): EncapsulatedElementType {
    return Matchers.getElementByID(ActivityDetailsSelectorsIDs.SCREEN);
  }

  get statusPill(): EncapsulatedElementType {
    return Matchers.getElementByID(ActivityDetailsSelectorsIDs.STATUS_PILL);
  }

  async verifyStatus(status: string, timeout = 20000): Promise<void> {
    await Assertions.expectTextDisplayed(status, {
      description: `Status pill should be ${status}`,
      timeout,
    });
  }
}

export default new ActivityDetails();
