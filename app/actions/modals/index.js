// eslint-disable-next-line import/prefer-default-export
export function toggleNetworkModal() {
  return {
    type: 'TOGGLE_NETWORK_MODAL',
  };
}

export function toggleAccountsModal() {
  return {
    type: 'TOGGLE_ACCOUNT_MODAL',
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

export const openLedgerTransactionModal = (params) => ({
  type: 'OPEN_LEDGER_TRANSACTION_ACTION',
  params,
});

export const closeLedgerTransactionModal = () => ({
  type: 'CLOSE_LEDGER_TRANSACTION_ACTION',
});

export const openLedgerSignModal = (params) => ({
  type: 'OPEN_LEDGER_SIGN_ACTION',
  params,
});

export const closeLedgerSignModal = () => ({
  type: 'CLOSE_LEDGER_SIGN_ACTION',
});
