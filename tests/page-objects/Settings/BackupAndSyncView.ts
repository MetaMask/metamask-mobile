import { Matchers, Gestures, type AppiumElement } from '../../framework';
import { BACKUP_AND_SYNC_TOGGLE_TEST_IDS } from '../../../app/components/UI/Identity/BackupAndSyncToggle/BackupAndSyncToggle.testIds';
import { BACKUP_AND_SYNC_FEATURES_TOGGLES_TEST_IDS } from '../../../app/components/UI/Identity/BackupAndSyncFeaturesToggles/BackupAndSyncFeaturesToggles.testIds';

class BackupAndSyncView {
  get accountSyncToggle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      BACKUP_AND_SYNC_FEATURES_TOGGLES_TEST_IDS.TOGGLE_ACCOUNT_SYNCING,
    );
  }

  get backupAndSyncToggle(): Promise<AppiumElement> {
    return Matchers.getElementByID(BACKUP_AND_SYNC_TOGGLE_TEST_IDS.TOGGLE);
  }

  get contactSyncToggle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      BACKUP_AND_SYNC_FEATURES_TOGGLES_TEST_IDS.TOGGLE_CONTACT_SYNCING,
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
