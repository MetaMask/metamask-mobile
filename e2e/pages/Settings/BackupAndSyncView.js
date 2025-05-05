import TestHelpers from '../../helpers';
import { BackupAndSyncViewSelectorsIDs } from '../../selectors/Settings/BackupAndSyncView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class BackupAndSyncView {
  get accountSyncToggle() {
    return Matchers.getElementByID(
      BackupAndSyncViewSelectorsIDs.ACCOUNT_SYNC_TOGGLE,
    );
  }

  get backupAndSyncToggle() {
    return Matchers.getElementByID(
      BackupAndSyncViewSelectorsIDs.BACKUP_AND_SYNC_TOGGLE,
    );
  }

  async toggleBackupAndSync() {
    await Gestures.waitAndTap(this.backupAndSyncToggle);
    await TestHelpers.delay(2000);
  }

  async toggleAccountSync() {
    await Gestures.waitAndTap(this.accountSyncToggle);
    await TestHelpers.delay(2000);
  }
}

export default new BackupAndSyncView();
