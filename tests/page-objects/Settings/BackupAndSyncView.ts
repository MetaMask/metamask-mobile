import { BackupAndSyncViewSelectorsIDs } from '../../locators/Settings/BackupAndSyncView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class BackupAndSyncView {
  get accountSyncToggle(): DetoxElement {
    return Matchers.getElementByID(
      BackupAndSyncViewSelectorsIDs.ACCOUNT_SYNC_TOGGLE,
    );
  }

  get backupAndSyncToggle(): DetoxElement {
    return Matchers.getElementByID(
      BackupAndSyncViewSelectorsIDs.BACKUP_AND_SYNC_TOGGLE,
    );
  }

  get contactSyncToggle(): DetoxElement {
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
