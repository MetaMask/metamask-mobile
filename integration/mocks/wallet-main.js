const React = require('react');
const { useState } = React;
const { View, Pressable } = require('react-native');

function WalletMainMock() {
  const [accounts, setAccounts] = useState([]);
  return React.createElement(
    View,
    { testID: 'wallet-screen' },
    // Wallet Details container
    React.createElement(
      View,
      { testID: 'wallet-details-container' },
      // Accounts list
      React.createElement(
        View,
        { testID: 'wallet-details-accounts-list' },
        accounts.map((_, idx) =>
          React.createElement(View, {
            key: idx,
            testID: 'wallet-details-account-item',
          }),
        ),
      ),
      // Add account button
      React.createElement(
        Pressable,
        {
          testID: 'wallet-details-add-account-button',
          onPress: () => setAccounts((prev) => [...prev, {}]),
        },
        React.createElement(View, {
          testID: 'wallet-details-add-account-button-inner',
        }),
      ),
    ),
  );
}

module.exports = WalletMainMock;
