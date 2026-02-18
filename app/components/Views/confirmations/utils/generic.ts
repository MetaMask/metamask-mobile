import { Hex } from '@metamask/utils';
import { TokenI } from '../../../UI/Tokens/types';
import { getNativeTokenAddress } from '@metamask/assets-controllers';

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

export const isNativeToken = (selectedAsset: TokenI) => {
  const { isNative, isETH, chainId } = selectedAsset;
  const nativeTokenAddress = getNativeTokenAddress(chainId as Hex);
  const isNativeTokenAddress = selectedAsset.address === nativeTokenAddress;

  return isNative || isETH || isNativeTokenAddress;
};
