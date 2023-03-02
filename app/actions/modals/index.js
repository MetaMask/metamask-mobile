// eslint-disable-next-line import/prefer-default-export
export function toggleNetworkModal(shouldNetworkSwitchPopToWallet = true) {
  return {
    type: 'TOGGLE_NETWORK_MODAL',
    shouldNetworkSwitchPopToWallet,
  };
}

export function toggleSDKLoadingModal(visible) {
  return {
    type: 'TOGGLE_SDKLOADING_MODAL',
    visible,
  };
}

export function toggleSDKFeedbackModal(visible) {
  return {
    type: 'TOGGLE_SDKFEEDBACK_MODAL',
    visible,
  };
}

export function toggleAccountApprovalModal(visible) {
  console.debug(`toggleAccountApprovalModal visible=${visible}`);
  return {
    type: 'TOGGLE_ACCOUNT_APPROVAL_MODAL',
    visible,
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

export function toggleApproveModal(show) {
  return {
    type: 'TOGGLE_APPROVE_MODAL',
    show,
  };
}
