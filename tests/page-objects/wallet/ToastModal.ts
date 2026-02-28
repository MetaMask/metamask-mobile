import {
  ToastSelectorsIDs,
  ToastSelectorsText,
} from '../../../app/component-library/components/Toast/ToastModal.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class ToastModal {
  get container(): DetoxElement {
    return Matchers.getElementByID(ToastSelectorsIDs.CONTAINER);
  }

  get notificationTitle(): DetoxElement {
    return Matchers.getElementByID(ToastSelectorsIDs.NOTIFICATION_TITLE);
  }

  get toastCloseButton(): DetoxElement {
    return Matchers.getElementByText(ToastSelectorsText.CLOSE_BUTTON);
  }

  purchaseCompletedToast(amount: string, currency: string): DetoxElement {
    return Matchers.getElementByText(
      ToastSelectorsText.PURCHASE_COMPLETED_TITLE.replace(
        '{{amount}}',
        amount,
      ).replace('{{currency}}', currency),
    );
  }

  depositCompletedToast(amount: string, currency: string): DetoxElement {
    return Matchers.getElementByText(
      ToastSelectorsText.DEPOSIT_COMPLETED_TITLE.replace(
        '{{amount}}',
        amount,
      ).replace('{{currency}}', currency),
    );
  }

  async tapToastCloseButton(): Promise<void> {
    await Gestures.waitAndTap(this.toastCloseButton, {
      elemDescription: 'Toast Modal Close Button',
    });
  }
}

export default new ToastModal();
