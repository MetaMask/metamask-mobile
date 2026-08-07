/**
 * Selectors for the native download confirmation / success UI
 * (Alert.alert / system dialog after a browser file download).
 */
export const DownloadFileSelectorsIDs = {
  /** RN Alert.alert positive button — Android system Dialog button1 resource-id. */
  ANDROID_CONFIRM_DOWNLOAD_BUTTON: 'android:id/button1',
} as const;

export const DownloadFileSelectorsText = {
  ANDROID_DOWNLOAD_COMPLETE: 'Download complete',
} as const;

export const DownloadFileSelectorsAccessibilityIDs = {
  /** UIDocumentPickerViewController Cancel — present but not hittable on iOS. */
  IOS_SAVE_SHEET_CANCEL: 'Cancel',
} as const;

export type DownloadFileSelectorsIDsType = typeof DownloadFileSelectorsIDs;
export type DownloadFileSelectorsTextType = typeof DownloadFileSelectorsText;
export type DownloadFileSelectorsAccessibilityIDsType =
  typeof DownloadFileSelectorsAccessibilityIDs;
