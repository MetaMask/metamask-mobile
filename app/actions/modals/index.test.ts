import {
  toggleCollectibleContractModal,
  toggleDappTransactionModal,
  toggleInfoNetworkModal,
  toggleNetworkModal,
  toggleReceiveModal,
  toggleSignModal,
} from '.';

describe('toggleNetworkModal', () => {
  it('should create an action to toggle the network modal', () => {
    const shouldNetworkSwitchPopToWallet = false;
    const expectedAction = {
      type: 'TOGGLE_NETWORK_MODAL',
      shouldNetworkSwitchPopToWallet,
    };
    expect(toggleNetworkModal(shouldNetworkSwitchPopToWallet)).toEqual(
      expectedAction,
    );
  });

  it('should default to true if shouldNetworkSwitchPopToWallet not specified ', () => {
    const shouldNetworkSwitchPopToWallet = true;
    const expectedAction = {
      type: 'TOGGLE_NETWORK_MODAL',
      shouldNetworkSwitchPopToWallet,
    };
    expect(toggleNetworkModal()).toEqual(expectedAction);
  });
});

describe('toggleCollectibleContractModal', () => {
  it('should return an object with type "TOGGLE_COLLECTIBLE_CONTRACT_MODAL"', () => {
    const result = toggleCollectibleContractModal();
    expect(result).toEqual({ type: 'TOGGLE_COLLECTIBLE_CONTRACT_MODAL' });
  });
});

describe('toggleReceiveModal', () => {
  it('returns an object with the correct type and asset', () => {
    const asset = 'ETH';
    const expectedAction = {
      type: 'TOGGLE_RECEIVE_MODAL',
      asset,
    };
    expect(toggleReceiveModal(asset)).toEqual(expectedAction);
  });

  it('returns an object with the correct type and empty asset', () => {
    const expectedAction = {
      type: 'TOGGLE_RECEIVE_MODAL',
      asset: undefined,
    };
    expect(toggleReceiveModal()).toEqual(expectedAction);
  });
});

describe('toggleInfoNetworkModal', () => {
  it('should return an object with type "TOGGLE_INFO_NETWORK_MODAL" and the passed show value', () => {
    const result = toggleInfoNetworkModal(true);
    expect(result).toEqual({ type: 'TOGGLE_INFO_NETWORK_MODAL', show: true });
  });
});

describe('toggleSignModal', () => {
  it('should return an object with type "TOGGLE_SIGN_MODAL" and the passed show value', () => {
    const result = toggleSignModal(false);
    expect(result).toEqual({ type: 'TOGGLE_SIGN_MODAL', show: false });
  });
});

describe('toggleDappTransactionModal', () => {
  it('should return an object with type "TOGGLE_DAPP_TRANSACTION_MODAL" and the passed show value', () => {
    const result = toggleDappTransactionModal(true);
    expect(result).toEqual({
      type: 'TOGGLE_DAPP_TRANSACTION_MODAL',
      show: true,
    });
  });
});
