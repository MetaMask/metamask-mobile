import React, { useCallback, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { GachaCardImageTestIds } from '../../Gacha.testIds';

/** Trading card proportions (width / height). */
export const CARD_ASPECT_RATIO = 5 / 7;
const ASPECT_STYLE = { aspectRatio: CARD_ASPECT_RATIO };

export interface CardImageProps {
  uri?: string;
  /** Tailwind radius class, e.g. `rounded-xl`. */
  roundedClassName?: string;
  accessibilityLabel?: string;
}

/** Card front with a skeleton while loading and an icon fallback on error. */
const CardImage = ({
  uri,
  roundedClassName = 'rounded-xl',
  accessibilityLabel,
}: CardImageProps) => {
  const tw = useTailwind();
  const [loadedUri, setLoadedUri] = useState<string | undefined>(undefined);
  const [failedUri, setFailedUri] = useState<string | undefined>(undefined);
  const hasFailed = !uri || failedUri === uri;
  const isLoading = !hasFailed && loadedUri !== uri;

  const source = useMemo(() => ({ uri }), [uri]);
  const handleLoad = useCallback(() => setLoadedUri(uri), [uri]);
  const handleError = useCallback(() => setFailedUri(uri), [uri]);

  return (
    <Box
      twClassName={`w-full overflow-hidden bg-muted ${roundedClassName}`}
      style={ASPECT_STYLE}
    >
      {!hasFailed && (
        <Image
          source={source}
          style={tw.style('h-full w-full')}
          contentFit="contain"
          recyclingKey={uri}
          cachePolicy="memory-disk"
          onLoad={handleLoad}
          onError={handleError}
          accessibilityLabel={accessibilityLabel}
          testID={GachaCardImageTestIds.IMAGE}
        />
      )}
      {isLoading && (
        <Skeleton
          twClassName="absolute inset-0"
          testID={GachaCardImageTestIds.SKELETON}
        />
      )}
      {hasFailed && (
        <Box
          twClassName="absolute inset-0"
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          testID={GachaCardImageTestIds.FALLBACK}
        >
          <Icon
            name={IconName.Image}
            size={IconSize.Xl}
            color={IconColor.IconMuted}
          />
        </Box>
      )}
    </Box>
  );
};

export default CardImage;
