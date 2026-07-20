import { Hex } from '@metamask/utils';
import { TokenI } from '../../../UI/Tokens/types';
import { getNativeTokenAddress } from '@metamask/assets-controllers';

const PAYMENT_METHOD_DISPLAY_OVERRIDES: Record<string, string> = {
  'Debit or Credit': 'Debit',
};

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

/**
 * Returns the user-facing label for a payment method.
 *
 * The on-ramp API sends names like "Debit or Credit", but the product
 * requirement is to show "Debit" only (credit cards are not fully
 * supported). This function maps API names to their display equivalents.
 */
export function getPaymentMethodDisplayName(name: string): string;
export function getPaymentMethodDisplayName(
  name: string | undefined,
): string | undefined;
export function getPaymentMethodDisplayName(
  name: string | undefined,
): string | undefined {
  if (!name) {
    return name;
  }

  return PAYMENT_METHOD_DISPLAY_OVERRIDES[name] ?? name;
}
