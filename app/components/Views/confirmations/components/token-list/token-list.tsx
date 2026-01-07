import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';

import Routes from '../../../../../constants/navigation/Routes';
import { AssetType } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import { useSendScreenNavigation } from '../../hooks/send/useSendScreenNavigation';
import { useAssetSelectionMetrics } from '../../hooks/send/metrics/useAssetSelectionMetrics';
import { Token } from '../UI/token';

const TOKEN_COUNT_PER_PAGE = 20;
interface TokenListProps {
  onSelect?: (token: AssetType) => void;
  tokens: AssetType[];
}

export function TokenList({ onSelect, tokens }: TokenListProps) {
  const { gotToSendScreen } = useSendScreenNavigation();
  const {
    updateAsset,
    asset: existingSelectedAsset,
    updateTo,
  } = useSendContext();
  const { captureAssetSelected } = useAssetSelectionMetrics();
  const [visibleTokenCount, setVisibleTokenCount] =
    useState(TOKEN_COUNT_PER_PAGE);

  const handleTokenPress = useCallback(
    (asset: AssetType) => {
      if (onSelect) {
        onSelect(asset);
        return;
      }

      const position = tokens.findIndex(
        ({ address }) => address === asset.address,
      );

      captureAssetSelected(asset, position.toString());
      updateAsset(asset);

      // Reset the to address when a new asset is selected
      if (existingSelectedAsset) {
        updateTo('');
      }

      gotToSendScreen(Routes.SEND.AMOUNT);
    },
    [
      captureAssetSelected,
      existingSelectedAsset,
      gotToSendScreen,
      onSelect,
      tokens,
      updateAsset,
      updateTo,
    ],
  );

  const handleShowMore = useCallback(() => {
    setVisibleTokenCount((prev) => prev + TOKEN_COUNT_PER_PAGE);
  }, []);

  const visibleTokens = tokens.slice(0, visibleTokenCount);
  const hasMoreTokens = tokens.length > visibleTokenCount;

  return (
    <>
      <Box>
        {visibleTokens.map((token) => (
          <Token
            key={`${token.chainId}-${token.address}`}
            asset={token}
            onPress={handleTokenPress}
          />
        ))}
      </Box>
      {hasMoreTokens && (
        <Button variant={ButtonVariant.Tertiary} onPress={handleShowMore}>
          Show more tokens
        </Button>
      )}
    </>
  );
}
