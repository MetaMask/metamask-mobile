import { BackupAndSyncViewSelectorsIDs } from '../../selectors/Settings/BackupAndSyncView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { type AppiumElement } from '../../framework';

class BackupAndSyncView {
  get accountSyncToggle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      BackupAndSyncViewSelectorsIDs.ACCOUNT_SYNC_TOGGLE,
    );
  }

  get backupAndSyncToggle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      BackupAndSyncViewSelectorsIDs.BACKUP_AND_SYNC_TOGGLE,
    );
  }

  get contactSyncToggle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      BackupAndSyncViewSelectorsIDs.CONTACTS_SYNC_TOGGLE,
    );
  }

  async toggleBackupAndSync() {
    await Gestures.waitAndTap(this.backupAndSyncToggle, {
      elemDescription: 'Backup and Sync Toggle in Backup and Sync View',
    });
  }

  async toggleAccountSync() {
    await Gestures.waitAndTap(this.accountSyncToggle, {
      elemDescription: 'Account Sync Toggle in Backup and Sync View',
    });
  }

  async toggleContactSync() {
    await Gestures.waitAndTap(this.contactSyncToggle, {
      elemDescription: 'Contacts Sync Toggle in Backup and Sync View',
    });
  }
}

export default new BackupAndSyncView();
