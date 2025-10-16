// browser.js
// Page Object for Browser and dApp connection screens

/* global output */

output.browser = {
  // Tab Bar
  tabBar: {
    browserTab: 'tab-bar-item-Browser',
  },

  // Browser Screen
  screen: {
    defaultUrl: 'https://portfolio.metamask.io',
  },

  // Connection Modal
  connectionModal: {
    title: 'Connect this website with MetaMask',
    connectBtn: 'connect-button',
    successMessage: 'Permissions updated',
  },
};
