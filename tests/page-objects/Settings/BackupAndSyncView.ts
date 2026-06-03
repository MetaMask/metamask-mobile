import { BackupAndSyncViewSelectorsIDs } from '../../selectors/Settings/BackupAndSyncView.selectors';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class BackupAndSyncView {
  get accountSyncToggle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          BackupAndSyncViewSelectorsIDs.ACCOUNT_SYNC_TOGGLE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          BackupAndSyncViewSelectorsIDs.ACCOUNT_SYNC_TOGGLE,
        ),
    });
  }

  get backupAndSyncToggle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          BackupAndSyncViewSelectorsIDs.BACKUP_AND_SYNC_TOGGLE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          BackupAndSyncViewSelectorsIDs.BACKUP_AND_SYNC_TOGGLE,
        ),
    });
  }

  get contactSyncToggle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          BackupAndSyncViewSelectorsIDs.CONTACTS_SYNC_TOGGLE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          BackupAndSyncViewSelectorsIDs.CONTACTS_SYNC_TOGGLE,
        ),
    });
  }

  async toggleBackupAndSync() {
    await UnifiedGestures.waitAndTap(this.backupAndSyncToggle, {
      elemDescription: 'Backup and Sync Toggle in Backup and Sync View',
    });
  }

  async toggleAccountSync() {
    await UnifiedGestures.waitAndTap(this.accountSyncToggle, {
      elemDescription: 'Account Sync Toggle in Backup and Sync View',
    });
  }

  async toggleContactSync() {
    await UnifiedGestures.waitAndTap(this.contactSyncToggle, {
      elemDescription: 'Contacts Sync Toggle in Backup and Sync View',
    });
  }
}

export default new BackupAndSyncView();
