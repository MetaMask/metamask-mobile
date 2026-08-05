export const EnsWebsiteSelectorsXPath = {
  GENERAL_LINK: "//a[@href='./categories/general.html']",
} as const;

/** Full UiSelector fragments for Android native a11y taps (no WebView context). */
export const EnsWebsiteSelectorsText = {
  PAGE_HEADING: '.textContains("vitalik.eth")',
  // WebView links are not always marked clickable in the Android a11y tree.
  GENERAL_LINK: '.text("General")',
} as const;

export type EnsWebsiteSelectorsXPathType = typeof EnsWebsiteSelectorsXPath;
export type EnsWebsiteSelectorsTextType = typeof EnsWebsiteSelectorsText;
