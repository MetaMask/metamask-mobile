export const RedirectWebsiteSelectorsIDs = {
  REDIRECT_BUTTON_HTTPS: 'redirect_button_https',
  REDIRECT_BUTTON_HTTP: 'redirect_button_http',
} as const;

export const RedirectWebsiteSelectorsXPath = {
  REDIRECT_BUTTON_HTTPS: `//button[@id='${RedirectWebsiteSelectorsIDs.REDIRECT_BUTTON_HTTPS}']`,
  REDIRECT_BUTTON_HTTP: `//button[@id='${RedirectWebsiteSelectorsIDs.REDIRECT_BUTTON_HTTP}']`,
} as const;

export type RedirectWebsiteSelectorsIDsType =
  typeof RedirectWebsiteSelectorsIDs;
export type RedirectWebsiteSelectorsXPathType =
  typeof RedirectWebsiteSelectorsXPath;
