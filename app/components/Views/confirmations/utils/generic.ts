import { Hex } from '@metamask/utils';
import { TokenI } from '../../../UI/Tokens/types';
import { getNativeTokenAddress } from '@metamask/assets-controllers';

const PAYMENT_METHOD_DISPLAY_OVERRIDES: Record<string, string> = {
  'debit-credit-card': 'Debit',
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
 * Keys on the stable `paymentType` slug (e.g. "debit-credit-card")
 * rather than the localizable `name`, so the override survives i18n
 * changes from the on-ramp API.
 */
export function getPaymentMethodDisplayName(
  paymentType: string,
  fallbackName: string,
): string;
export function getPaymentMethodDisplayName(
  paymentType: string | undefined,
  fallbackName: string | undefined,
): string | undefined;
export function getPaymentMethodDisplayName(
  paymentType: string | undefined,
  fallbackName: string | undefined,
): string | undefined {
  if (!paymentType) {
    return fallbackName;
  }

  return PAYMENT_METHOD_DISPLAY_OVERRIDES[paymentType] ?? fallbackName;
}
