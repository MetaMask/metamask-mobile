import Device from '../device';

const IS_IOS_NFT_SEND_ENABLED = false;

// eslint-disable-next-line import/prefer-default-export
export const isIOSNftTradable = () => {
  if (Device.isIos()) return IS_IOS_NFT_SEND_ENABLED;
  return true;
};
