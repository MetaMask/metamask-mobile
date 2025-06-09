import { TokenI } from '../../../UI/Tokens/types';

export const getHostFromUrl = (url: string) => {
  if (!url) {
    return;
  }
  try {
    return new URL(url).host;
  } catch (error) {
    console.error(error as Error);
  }
  return;
};

export const isNativeToken = (selectedAsset: TokenI) =>
  selectedAsset.isNative || selectedAsset.isETH;
