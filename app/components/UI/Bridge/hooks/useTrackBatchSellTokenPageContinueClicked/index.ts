import { useCallback } from 'react';
import {
  BatchSellMetricsEventName,
  BatchSellMetricsLocation,
  formatAddressToAssetId,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';
import type { CaipAssetType } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import type { BridgeToken } from '../../types';

export function useTrackBatchSellTokenPageContinueClicked({
  location,
}: {
  location: BatchSellMetricsLocation;
}) {
  return useCallback(
    (selectedTokens: BridgeToken[]) => {
      const firstSourceToken = selectedTokens[0];

      if (!firstSourceToken) {
        return;
      }

      const sourceTokenAddresses = selectedTokens
        .map((token) => formatAddressToAssetId(token.address, token.chainId))
        .filter((assetId): assetId is CaipAssetType => Boolean(assetId));

      if (sourceTokenAddresses.length !== selectedTokens.length) {
        return;
      }

      const sourceChainId = formatChainIdToCaip(firstSourceToken.chainId);
      const eventProperties = {
        chain_id_destination: sourceChainId,
        chain_id_source: sourceChainId,
        location,
        source_token_addresses: sourceTokenAddresses,
        source_token_symbols: selectedTokens.map((token) => token.symbol),
      };

      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
        BatchSellMetricsEventName.BatchSellTokenPageContinueClicked,
        eventProperties,
      );
    },
    [location],
  );
}
