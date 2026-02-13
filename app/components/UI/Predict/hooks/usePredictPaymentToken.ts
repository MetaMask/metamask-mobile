import { useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectPredictPayWithAnyTokenEnabled } from '../selectors/featureFlags';
import { AssetType } from '../../../Views/confirmations/types/token';
import {
  PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
  PREDICT_BALANCE_CHAIN_ID,
} from '../constants/transactions';

/**
 * Represents a selected payment token.
 * When isPredictBalance is true, the user is paying from their Polymarket balance.
 */
export interface PaymentToken {
  /** Display name (e.g. "Predict Balance", "USDC", "ETH") */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Token address (placeholder address for predict balance) */
  address: string;
  /** Chain ID hex (Polygon for predict balance) */
  chainId: string;
  /** URI for the token icon */
  iconUrl?: string;
  /** Whether this is the Predict Balance pseudo-token */
  isPredictBalance: boolean;
}

export const PREDICT_BALANCE_TOKEN: PaymentToken = {
  name: 'Predict Balance',
  symbol: 'USD',
  address: PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
  chainId: PREDICT_BALANCE_CHAIN_ID,
  isPredictBalance: true,
};

/**
 * Checks if a given address represents the synthetic Predict Balance token.
 */
export function isPredictBalanceAddress(address?: string): boolean {
  return (
    address?.toLowerCase() === PREDICT_BALANCE_PLACEHOLDER_ADDRESS.toLowerCase()
  );
}

/**
 * Converts an AssetType (from the Asset component selection) to our PaymentToken.
 */
export function assetToPaymentToken(asset: AssetType): PaymentToken {
  if (isPredictBalanceAddress(asset.address)) {
    return PREDICT_BALANCE_TOKEN;
  }

  return {
    name: asset.name || asset.symbol || '',
    symbol: asset.symbol || '',
    address: asset.address || '',
    chainId: asset.chainId || '',
    iconUrl: typeof asset.image === 'string' ? asset.image : undefined,
    isPredictBalance: false,
  };
}

interface UsePredictPaymentTokenReturn {
  selectedToken: PaymentToken;
  setSelectedToken: (token: PaymentToken) => void;
  selectFromAsset: (asset: AssetType) => void;
  isPredictBalance: boolean;
  isFeatureEnabled: boolean;
}

/**
 * Manages the selected payment token for the Predict buy flow.
 * Defaults to Predict Balance. When feature flag is off, always returns Predict Balance.
 */
export function usePredictPaymentToken(): UsePredictPaymentTokenReturn {
  const isFeatureEnabled = useSelector(selectPredictPayWithAnyTokenEnabled);

  const [selectedToken, setSelectedToken] = useState<PaymentToken>(
    PREDICT_BALANCE_TOKEN,
  );

  const handleSetSelectedToken = useCallback((token: PaymentToken) => {
    setSelectedToken(token);
  }, []);

  const selectFromAsset = useCallback((asset: AssetType) => {
    setSelectedToken(assetToPaymentToken(asset));
  }, []);

  const isPredictBalance = useMemo(
    () => selectedToken.isPredictBalance,
    [selectedToken],
  );

  return {
    selectedToken: isFeatureEnabled ? selectedToken : PREDICT_BALANCE_TOKEN,
    setSelectedToken: handleSetSelectedToken,
    selectFromAsset,
    isPredictBalance: isFeatureEnabled ? isPredictBalance : true,
    isFeatureEnabled,
  };
}
