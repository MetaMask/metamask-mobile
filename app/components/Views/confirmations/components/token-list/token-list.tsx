import React, { useCallback } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Box } from '@metamask/design-system-react-native';

import { useStyles } from '../../../../../component-library/hooks';
import { useSendScreenNavigation } from '../../hooks/send/useSendScreenNavigation';
import Routes from '../../../../../constants/navigation/Routes';
import { useSendContext } from '../../context/send-context';
import { AssetType } from '../../types/token';
import { Token } from '../UI/token';
import styleSheet from './token-list.styles';

interface TokenListProps {
  tokens: AssetType[];
}

export function TokenList({ tokens }: TokenListProps) {
  const { gotToSendScreen } = useSendScreenNavigation();
  const { updateAsset } = useSendContext();
  const { styles } = useStyles(styleSheet, {});

  const handleTokenPress = useCallback(
    (asset: AssetType) => {
      updateAsset(asset);
      gotToSendScreen(Routes.SEND.AMOUNT);
    },
    [gotToSendScreen, updateAsset],
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
        contentContainerStyle={styles.flashListContainer}
      />
    </Box>
  );
}
