export const EnsWebsiteSelectorsXPath = {
  GENERAL_LINK: "//a[@href='./categories/general.html']",
} as const;

/** Full UiSelector fragments for Android native a11y taps (no WebView context). */
export const EnsWebsiteSelectorsText = {
  PAGE_HEADING: '.textContains("vitalik.eth")',
  // Native WebView a11y text for the fixture link can be exact "General" or a
  // longer label; prefer contains. Links are often not marked displayed/enabled.
  GENERAL_LINK: '.textContains("General")',
} as const;

export type EnsWebsiteSelectorsXPathType = typeof EnsWebsiteSelectorsXPath;
export type EnsWebsiteSelectorsTextType = typeof EnsWebsiteSelectorsText;
