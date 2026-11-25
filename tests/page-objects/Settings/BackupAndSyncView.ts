import { BackupAndSyncViewSelectorsIDs } from '../../selectors/Settings/BackupAndSyncView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import { type AppiumElement } from '../../framework';
import Assertions from '../../framework/Assertions';

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
    const toggle = await this.accountSyncToggle;
    const wasEnabled = await Assertions.isToggleOn(toggle);
    await Gestures.waitAndTap(Promise.resolve(toggle), {
      elemDescription: 'Account Sync Toggle in Backup and Sync View',
    });
    await Utilities.executeWithRetry(
      async () => {
        const currentToggle = await this.accountSyncToggle;
        const isEnabled = await Assertions.isToggleOn(currentToggle);
        if (isEnabled === wasEnabled) {
          throw new Error('Account Sync Toggle state is still updating');
        }
      },
      {
        timeout: 10_000,
        interval: 250,
        description: 'Account Sync Toggle update',
      },
    );
  }

  async toggleContactSync() {
    await Gestures.waitAndTap(this.contactSyncToggle, {
      elemDescription: 'Contacts Sync Toggle in Backup and Sync View',
    });
  }
}

export default new BackupAndSyncView();
