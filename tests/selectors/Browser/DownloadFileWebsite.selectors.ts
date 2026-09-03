/**
 * Selectors for the download fixture pages under tests/fixtures/download/.
 */
export const DownloadFileWebsiteSelectorsIDs = {
  DOWNLOAD_BUTTON: 'download_button',
} as const;

/** Full UiSelector fragments for Android native a11y taps (no WebView context). */
export const DownloadFileWebsiteSelectorsText = {
  PAGE_HEADING: '.textContains("Download File document")',
  DOWNLOAD_BUTTON: '.text("Download").clickable(true)',
} as const;

export const DownloadFileWebsiteSelectorsXPath = {
  DOWNLOAD_BUTTON: `//button[@id='${DownloadFileWebsiteSelectorsIDs.DOWNLOAD_BUTTON}']`,
} as const;

export type DownloadFileWebsiteSelectorsIDsType =
  typeof DownloadFileWebsiteSelectorsIDs;
export type DownloadFileWebsiteSelectorsTextType =
  typeof DownloadFileWebsiteSelectorsText;
