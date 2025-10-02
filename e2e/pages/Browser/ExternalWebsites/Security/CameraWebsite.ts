import Matchers from '../../../../framework/Matchers.ts';
import { waitFor } from 'detox';

class CameraWebsite {
  async verifyRequestPermissionDialogVisible(): Promise<void> {
    if (device.getPlatform() === 'ios') {
      waitFor(
        await Matchers.getElementByLabel(
          'Allow "tyschenko.github.io" to use your camera?',
        ),
      ).toExist();
    } else {
      waitFor(
        await Matchers.getElementByText(
          'Allow tyschenko.github.io to use your camera?',
        ),
      ).toExist();
    }
  }
}

export default new CameraWebsite();
