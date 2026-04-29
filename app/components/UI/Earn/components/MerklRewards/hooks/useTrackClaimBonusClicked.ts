import { useCallback } from 'react';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { LINEA_MUSD_ASSET_FOR_MERKL } from '../../../../../Views/Homepage/Sections/Cash/CashGetMusdEmptyState.constants';

/**
 * Returns a tracker that fires `MUSD_CLAIM_BONUS_BUTTON_CLICKED` with the
 * standard properties used by every claim CTA (Wallet Home, Money Hub, asset
 * overview, empty state). The caller passes the analytics location of the
 * surface where the tap originated.
 */
export const useTrackClaimBonusClicked = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();

  return useCallback(
    (location: string) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.MUSD_CLAIM_BONUS_BUTTON_CLICKED)
          .addProperties({
            location,
            action_type: 'claim_bonus',
            network_chain_id: LINEA_MUSD_ASSET_FOR_MERKL.chainId,
            asset_symbol: LINEA_MUSD_ASSET_FOR_MERKL.symbol,
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder],
  );
};
