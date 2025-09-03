import React, { useCallback } from 'react';
import { FlashList } from '@shopify/flash-list';
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

  const renderTokenListItem = useCallback(
    ({ item }: { item: AssetType }) => (
      <Token asset={item} onPress={handleTokenPress} />
    ),
    [handleTokenPress],
  );

  const keyExtractor = useCallback(
    (item: AssetType) => `${item.address}-${item.chainId}`,
    [],
  );

  return (
    <Box twClassName="flex-1">
      <FlashList
        data={tokens}
        decelerationRate={0}
        keyExtractor={keyExtractor}
        removeClippedSubviews
        renderItem={renderTokenListItem}
      />
    </Box>
  );
}
