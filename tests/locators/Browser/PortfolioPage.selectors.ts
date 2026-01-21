export const PortfolioPageSelectorsXpath = {
  CLOSE_PRIVACY_MODAL: '//*[@aria-label="Close modal"]',
  ACCOUNT_ICON_HREF: '//a[@href="/settings/accounts"]',
} as const;

export const PortfolioPageSelectorsWebID = {
  CONNECT_WALLET_BUTTON: 'connect-wallet-button',
  BURGER_MENU_BUTTON: 'dashboard-mobile-button',
} as const;

// Export types for the selector objects
export type PortfolioPageSelectorsXpathType =
  typeof PortfolioPageSelectorsXpath;
export type PortfolioPageSelectorsWebIDType =
  typeof PortfolioPageSelectorsWebID;
