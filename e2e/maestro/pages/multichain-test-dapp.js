// multichain-test-dapp.js
// Page Object for MetaMask Multichain Test dApp elements

/* global output */

output.testDapp = {
  // dApp URL
  url: 'https://metamask.github.io/test-dapp-multichain/latest/',

  // Connection Buttons
  autoConnectBtn: 'auto-connect-postmessage-button',
  createSessionBtn: 'create-session-btn',

  // Network Checkboxes
  networks: {
    ethereum: 'network-checkbox-eip155-1',
    linea: 'network-checkbox-eip155-59144',
    solana: 'network-checkbox-solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  },
};
