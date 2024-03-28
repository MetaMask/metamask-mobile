export const networkIdUpdated = (networkId: string) => ({
  type: 'NETWORK_ID_UPDATED',
  networkId,
});
export const networkIdWillUpdate = () => ({
  type: 'NETWORK_WILL_UPDATE',
  networkId: '',
});
