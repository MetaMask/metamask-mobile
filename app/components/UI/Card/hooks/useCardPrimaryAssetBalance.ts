import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCardHomeData } from '../../../../selectors/cardController';
import { useAssetBalances } from './useAssetBalances';
import { toCardTokenAllowance } from '../util/toCardTokenAllowance';

/**
 * Returns the wallet balance (including fiat value) for the card's current
 * priority asset. Any screen can call this without mounting CardHome.
 *
 * Returns null when no primary asset is set or card home data hasn't loaded.
 * Returns { balanceFiat, balanceFormatted, rawFiatNumber, rawTokenBalance }
 * when available.
 *
 * Note: primaryAsset.balance is the on-chain token *allowance* (approved for
 * card spending), not the wallet balance. Fiat value is derived here from
 * the existing token price infrastructure.
 */
export const useCardPrimaryAssetBalance = () => {
  const cardHomeData = useSelector(selectCardHomeData);
  const primaryAsset = cardHomeData?.primaryAsset ?? null;

  const legacyToken = useMemo(
    () => (primaryAsset ? toCardTokenAllowance(primaryAsset) : null),
    [primaryAsset],
  );

  const balancesMap = useAssetBalances(legacyToken ? [legacyToken] : []);

  const key = legacyToken
    ? `${legacyToken.address?.toLowerCase()}-${legacyToken.caipChainId}-${legacyToken.walletAddress?.toLowerCase()}`
    : null;

  return key ? (balancesMap.get(key) ?? null) : null;
};
