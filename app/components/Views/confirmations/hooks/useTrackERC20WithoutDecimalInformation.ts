import { useEffect } from 'react';
import { Hex } from '@metamask/utils';

import { MetaMetricsEvents } from '../../../../core/Analytics';
import { TokenStandard } from '../../../../components/UI/SimulationDetails/types';
import { useMetrics } from '../../../../components/hooks/useMetrics';
import { parseTokenDetailDecimals, TokenDetailsERC20 } from '../utils/token';

/**
 * Track event that number of decimals in ERC20 is not obtained
 *
 * @param chainId
 * @param tokenAddress
 * @param tokenDetails
 * @param metricLocation
 */
const useTrackERC20WithoutDecimalInformation = (
  chainId: Hex,
  tokenAddress: Hex | string | undefined,
  tokenDetails?: TokenDetailsERC20,
  metricLocation: string = 'signature_confirmation',
) => {
  const { trackEvent, createEventBuilder } = useMetrics();

  useEffect(() => {
    if (chainId === undefined || tokenDetails === undefined) {
      return;
    }
    const { decimals, standard } = tokenDetails || {};

    if (standard !== TokenStandard.ERC20) {
      return;
    }

    const parsedDecimals = parseTokenDetailDecimals(decimals);

    if (parsedDecimals === undefined) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.INCOMPLETE_ASSET_DISPLAYED)
          .addProperties({
            token_decimals_available: false,
            asset_address: tokenAddress,
            asset_type: TokenStandard.ERC20,
            chain_id: chainId,
            location: metricLocation,
          })
          .build(),
      );
    }
  }, [
    chainId,
    tokenAddress,
    tokenDetails,
    metricLocation,
    trackEvent,
    createEventBuilder,
  ]);
};

export default useTrackERC20WithoutDecimalInformation;
