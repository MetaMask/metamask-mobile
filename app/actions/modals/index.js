// eslint-disable-next-line import/prefer-default-export
export function toggleNetworkModal(shouldNetworkSwitchPopToWallet = true) {
  return {
    type: 'TOGGLE_NETWORK_MODAL',
    shouldNetworkSwitchPopToWallet,
  };
}

export function toggleCollectibleContractModal() {
  return {
    type: 'TOGGLE_COLLECTIBLE_CONTRACT_MODAL',
  };
}

export function toggleReceiveModal(asset) {
  return {
    type: 'TOGGLE_RECEIVE_MODAL',
    asset,
  };
}

export function toggleDappTransactionModal(show) {
  return {
    type: 'TOGGLE_DAPP_TRANSACTION_MODAL',
    show,
  };
}

export function toggleInfoNetworkModal(show) {
  return {
    type: 'TOGGLE_INFO_NETWORK_MODAL',
    show,
  };
}
