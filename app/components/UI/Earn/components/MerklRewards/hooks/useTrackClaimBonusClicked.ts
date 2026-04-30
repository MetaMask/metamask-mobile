import { useCallback } from 'react';
import { Hex } from '@metamask/utils';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { LINEA_MUSD_ASSET_FOR_MERKL } from '../../../../../Views/Homepage/Sections/Cash/CashGetMusdEmptyState.constants';

interface TrackClaimBonusOverrides {
  chainId?: Hex;
  assetSymbol?: string;
  networkName?: string;
}

export const useTrackClaimBonusClicked = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();

  return useCallback(
    (location: string, overrides?: TrackClaimBonusOverrides) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.MUSD_CLAIM_BONUS_BUTTON_CLICKED)
          .addProperties({
            location,
            action_type: 'claim_bonus',
            network_chain_id:
              overrides?.chainId ?? LINEA_MUSD_ASSET_FOR_MERKL.chainId,
            asset_symbol:
              overrides?.assetSymbol ?? LINEA_MUSD_ASSET_FOR_MERKL.symbol,
            ...(overrides?.networkName
              ? { network_name: overrides.networkName }
              : {}),
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder],
  );
};
