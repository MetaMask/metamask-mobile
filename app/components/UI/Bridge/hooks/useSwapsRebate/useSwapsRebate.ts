import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { QuoteResponse } from '@metamask/bridge-controller';
import Engine from '../../../../../core/Engine';
import { selectSwapsRebateBannerEnabled } from '../../../../../selectors/featureFlagController/swapsRebateBanner';

/**
 * Rebate percentage of the MetaMask fee for the selected swap quote, paid to
 * the user's Money account, or `null` when no rebate should show.
 *
 * Gated by the `swapsRebateBannerEnabled` remote flag. Fetches once on mount
 * and again only when the MetaMask fee token changes, never on quote refresh.
 * Any error hides the row and is not retried.
 *
 * @param quote - The selected bridge quote.
 * @returns The rebate percentage, or `null`.
 */
export const useSwapsRebate = (
  quote?: QuoteResponse['quote'],
): number | null => {
  const isEnabled = useSelector(selectSwapsRebateBannerEnabled);
  const [rebateBips, setRebateBips] = useState<number | null>(null);
  const quoteRef = useRef(quote);
  quoteRef.current = quote;
  const feeAssetId = quote?.feeData?.metabridge?.[0]?.asset?.assetId;

  useEffect(() => {
    setRebateBips(null);
    const currentQuote = quoteRef.current;
    if (!isEnabled || !feeAssetId || !currentQuote) {
      return;
    }

    let cancelled = false;
    Engine.controllerMessenger
      .call('RewardsMoneyController:getSwapsRebateQuote', currentQuote)
      .then(({ eligible, rebateBips: bips, reason }) => {
        if (!cancelled && eligible && !reason) {
          setRebateBips(bips);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isEnabled, feeAssetId]);

  return rebateBips ? rebateBips / 100 : null;
};
