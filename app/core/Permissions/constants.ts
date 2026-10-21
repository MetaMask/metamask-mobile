export const CaveatTypes = Object.freeze({
  restrictReturnedAccounts: 'restrictReturnedAccounts',
  restrictNetworkSwitching: 'restrictNetworkSwitching',
});

export const RestrictedMethods = Object.freeze({
  eth_accounts: 'eth_accounts',
  // Snap Specific Restricted Methods
  snap_notify: 'snap_notify',
  snap_dialog: 'snap_dialog',
  snap_manageState: 'snap_manageState',
  snap_getBip32PublicKey: 'snap_getBip32PublicKey',
  snap_getBip32Entropy: 'snap_getBip32Entropy',
  snap_getBip44Entropy: 'snap_getBip44Entropy',
  snap_getEntropy: 'snap_getEntropy',
  wallet_snap: 'wallet_snap',
});
