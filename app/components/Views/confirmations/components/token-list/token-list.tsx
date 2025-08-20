import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';

import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { AssetType } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import { useSendScreenNavigation } from '../../hooks/send/useSendScreenNavigation';
import { useAssetSelectionMetrics } from '../../hooks/send/metrics/useAssetSelectionMetrics';
import { Token } from '../UI/token';

const TOKEN_COUNT_PER_PAGE = 20;
interface TokenListProps {
  tokens: AssetType[];
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function TokenList({
  tokens,
  hasActiveFilters = false,
  onClearFilters,
}: TokenListProps) {
  const { gotToSendScreen } = useSendScreenNavigation();
  const { updateAsset } = useSendContext();
  const { captureAssetSelected } = useAssetSelectionMetrics();
  const [visibleTokenCount, setVisibleTokenCount] =
    useState(TOKEN_COUNT_PER_PAGE);

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

  const handleShowMore = useCallback(() => {
    setVisibleTokenCount((prev) => prev + TOKEN_COUNT_PER_PAGE);
  }, []);

  const visibleTokens = tokens.slice(0, visibleTokenCount);
  const hasMoreTokens = tokens.length > visibleTokenCount;

  // Show empty state when no tokens and filters are active
  if (tokens.length === 0 && hasActiveFilters && onClearFilters) {
    return (
      <Box twClassName="items-center py-8 px-4">
        <Text variant={TextVariant.BodyMd} twClassName="text-center mb-4">
          {strings('send.no_tokens_match_filters')}
        </Text>
        <Button variant={ButtonVariant.Secondary} onPress={onClearFilters}>
          {strings('send.clear_filters')}
        </Button>
      </Box>
    );
  }

  // Show empty state when no tokens at all
  if (tokens.length === 0) {
    return (
      <Box twClassName="items-center py-8 px-4">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('send.no_tokens_available')}
        </Text>
      </Box>
    );
  }

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
        <Button
          variant={ButtonVariant.Tertiary}
          onPress={handleShowMore}
          twClassName="mb-8"
        >
          Show more tokens
        </Button>
      )}
    </>
  );
}
