import React from 'react';
import {
  AvatarBase,
  AvatarBaseShape,
  AvatarBaseSize,
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import { Image } from '../../../../UI/primitives/Image';
import { ActivityDetailsSelectorsIDs } from '../../ActivityDetails.testIds';
import { getPerpsAssetIconUrls } from './ActivityDetailsPerps.utils';

function PerpsHeroIcon({ symbol }: { symbol: string | undefined }) {
  const [useFallbackUrl, setUseFallbackUrl] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setUseFallbackUrl(false);
    setHasError(false);
  }, [symbol]);

  if (!symbol) {
    return null;
  }

  const iconUrls = getPerpsAssetIconUrls(symbol);
  const imageUri = iconUrls
    ? useFallbackUrl
      ? iconUrls.fallback
      : iconUrls.primary
    : undefined;
  const showFallback = !imageUri || hasError;
  const displaySymbol = getPerpsDisplaySymbol(symbol);

  return (
    <Box testID={ActivityDetailsSelectorsIDs.AMOUNT_AVATAR_SINGLE}>
      <AvatarBase
        size={AvatarBaseSize.Xl}
        shape={AvatarBaseShape.Circle}
        fallbackText={showFallback ? displaySymbol.substring(0, 2) : undefined}
      >
        {!showFallback && imageUri ? (
          <Image
            source={{ uri: imageUri }}
            className="size-full"
            contentFit="contain"
            cachePolicy="memory-disk"
            onError={() => {
              if (!useFallbackUrl && iconUrls?.fallback) {
                setUseFallbackUrl(true);
              } else {
                setHasError(true);
              }
            }}
          />
        ) : null}
      </AvatarBase>
    </Box>
  );
}

export function ActivityDetailsPerpsHero({
  amount,
  isPositive,
  symbol,
}: {
  amount: string | undefined;
  isPositive: boolean;
  symbol: string | undefined;
}) {
  if (!amount) {
    return null;
  }

  return (
    <Box
      className="flex-row items-center gap-3"
      testID={ActivityDetailsSelectorsIDs.AMOUNT_HEADER}
    >
      <PerpsHeroIcon symbol={symbol} />
      <Text
        variant={TextVariant.DisplayMd}
        color={isPositive ? TextColor.SuccessDefault : TextColor.TextDefault}
      >
        {amount}
      </Text>
    </Box>
  );
}
