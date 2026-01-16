import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../../../selectors/currencyRateController';
import { selectNativeCurrencyByChainId } from '../../../../../../selectors/networkController';
import { renderFromTokenMinimalUnit } from '../../../../../../util/number';
import { RootState } from '../../../../../../reducers';
import { TokenI } from '../../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../../constants/musd';

const MERKL_API_BASE_URL = 'https://api.merkl.xyz/v4';
const AGLAMERKL_ADDRESS = '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898'; // Used for test campaigns
const MUSD_ADDRESS = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET];

// Map of chains and eligible tokens
export const eligibleTokens: Record<Hex, Hex[]> = {
  [CHAIN_IDS.MAINNET]: [AGLAMERKL_ADDRESS], // Testing
  [CHAIN_IDS.LINEA_MAINNET]: [MUSD_ADDRESS], // Musd
};

/**
 * Check if a token is eligible for Merkl rewards
 * Compares addresses case-insensitively since Ethereum addresses are case-insensitive
 */
export const isEligibleForMerklRewards = (
  chainId: Hex,
  address: Hex,
): boolean => {
  const eligibleAddresses = eligibleTokens[chainId];
  if (!eligibleAddresses) {
    return false;
  }
  // Convert to lowercase for case-insensitive comparison
  const addressLower = address.toLowerCase();
  return eligibleAddresses.some(
    (eligibleAddress) => eligibleAddress.toLowerCase() === addressLower,
  );
};

interface MerklRewardData {
  rewards: {
    pending: string;
  }[];
}

interface UseMerklRewardsOptions {
  asset: TokenI;
  exchangeRate?: number;
}

interface UseMerklRewardsReturn {
  claimableReward: string | null;
}

/**
 * Custom hook to fetch and manage claimable Merkl rewards for AGLAMERKL token
 */
export const useMerklRewards = ({
  asset,
}: UseMerklRewardsOptions): UseMerklRewardsReturn => {
  const [claimableReward, setClaimableReward] = useState<string | null>(null);

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const conversionRateByTicker = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, asset.chainId as Hex),
  );

  useEffect(() => {
    const isEligible = isEligibleForMerklRewards(
      asset.chainId as Hex,
      asset.address as Hex,
    );

    if (!isEligible || !selectedAddress) {
      setClaimableReward(null);
      return;
    }

    // Reset claimableReward when switching assets to prevent stale data
    setClaimableReward(null);

    const fetchClaimableRewards = async () => {
      try {
        // Convert hex chainId to decimal for API (e.g., '0x1' -> 1)
        const decimalChainId = Number(asset.chainId);
        const response = await fetch(
          `${MERKL_API_BASE_URL}/users/${selectedAddress}/rewards?chainId=${decimalChainId}&test=true`,
        );

        if (!response.ok) {
          return;
        }

        const data: MerklRewardData[] = await response.json();

        // Get pending amount from [0].rewards[0].pending
        if (data?.[0]?.rewards?.[0]?.pending) {
          const pendingWei = data[0].rewards[0].pending;
          // Convert from wei to token amount (assuming 18 decimals)
          const pendingAmount = renderFromTokenMinimalUnit(
            pendingWei,
            asset.decimals || 18,
            2, // Show 2 decimal places
          );
          setClaimableReward(pendingAmount);
        }
      } catch (error) {
        // Silently handle errors - component will show no rewards if fetch fails
      }
    };

    fetchClaimableRewards();
  }, [
    asset.address,
    asset.decimals,
    selectedAddress,
    nativeCurrency,
    conversionRateByTicker,
    currentCurrency,
    asset.chainId,
  ]);

  return {
    claimableReward,
  };
};
