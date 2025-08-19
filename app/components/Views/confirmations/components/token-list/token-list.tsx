import React, { useCallback } from 'react';
import { Box } from '@metamask/design-system-react-native';

import { useSendScreenNavigation } from '../../hooks/send/useSendScreenNavigation';
import Routes from '../../../../../constants/navigation/Routes';
import { useAssetSelectionMetrics } from '../../hooks/send/metrics/useAssetSelectionMetrics';
import { useSendContext } from '../../context/send-context';
import { AssetType } from '../../types/token';
import { Token } from '../UI/token';

interface TokenListProps {
  tokens: AssetType[];
}

export function TokenList({ tokens }: TokenListProps) {
  const { gotToSendScreen } = useSendScreenNavigation();
  const { updateAsset } = useSendContext();
  const { captureAssetSelected } = useAssetSelectionMetrics();

  const handleTokenPress = useCallback(
    (asset: AssetType) => {
      const position = tokens.findIndex(
        ({ address }) => address === asset.address,
      );
      captureAssetSelected(asset, position.toString());
      updateAsset(asset);
      gotToSendScreen(Routes.SEND.AMOUNT);
    },
    [captureAssetSelected, gotToSendScreen, tokens, updateAsset],
  );

  return (
    <Box>
      {tokens.map((token) => (
        <Token
          key={`${token.chainId}-${token.address}`}
          asset={token}
          onPress={handleTokenPress}
        />
      ))}
    </Box>
  );
}
