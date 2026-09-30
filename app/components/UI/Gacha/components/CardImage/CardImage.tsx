import React, { useCallback, useMemo, useState } from 'react';
import { Image, type ImageLoadEventData } from 'expo-image';
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

export interface CardImageProps {
  uri?: string;
  /** A smaller image shown first while the original resolution loads. */
  previewUri?: string;
  /** Tailwind radius class, e.g. `rounded-xl`. */
  roundedClassName?: string;
  accessibilityLabel?: string;
  aspectRatio?: number;
  transparent?: boolean;
  onLoad?: (event: ImageLoadEventData) => void;
  onError?: () => void;
  testID?: string;
}

/** Preview first, then the original image; a failed upgrade keeps the preview. */
const CardImage = ({
  uri,
  previewUri,
  roundedClassName = 'rounded-xl',
  accessibilityLabel,
  aspectRatio = CARD_ASPECT_RATIO,
  transparent = false,
  onLoad,
  onError,
  testID = GachaCardImageTestIds.IMAGE,
}: CardImageProps) => {
  const tw = useTailwind();
  const [loadedUri, setLoadedUri] = useState<string | undefined>(undefined);
  const [failedUri, setFailedUri] = useState<string | undefined>(undefined);
  const [loadedPreviewUri, setLoadedPreviewUri] = useState<string>();
  const [failedPreviewUri, setFailedPreviewUri] = useState<string>();
  const preview = previewUri !== uri ? previewUri : undefined;
  const isPreviewReady = Boolean(preview && loadedPreviewUri === preview);
  const isOriginalReady = Boolean(uri && loadedUri === uri);
  const isPreviewLoading = Boolean(
    preview &&
      !isOriginalReady &&
      !isPreviewReady &&
      failedPreviewUri !== preview,
  );

  let sourceUri = isPreviewLoading ? preview : uri;
  if (!isPreviewLoading && (!uri || failedUri === uri)) {
    sourceUri = isPreviewReady ? preview : undefined;
  }
  const hasFailed = !sourceUri;
  const isLoading = !hasFailed && !isPreviewReady && !isOriginalReady;
  const isPreview = sourceUri === preview;

  const source = useMemo(() => ({ uri: sourceUri }), [sourceUri]);
  const placeholder = useMemo(
    () => (isPreviewReady ? { uri: preview } : undefined),
    [isPreviewReady, preview],
  );
  const handleLoad = useCallback(
    (event: ImageLoadEventData) => {
      if (isPreview) setLoadedPreviewUri(sourceUri);
      else setLoadedUri(sourceUri);
      onLoad?.(event);
    },
    [isPreview, sourceUri, onLoad],
  );
  const handleError = useCallback(() => {
    if (isPreview) {
      setFailedPreviewUri(sourceUri);
      if (!uri || failedUri === uri) onError?.();
    } else {
      setFailedUri(sourceUri);
      if (!isPreviewReady) onError?.();
    }
  }, [isPreview, sourceUri, uri, failedUri, isPreviewReady, onError]);

  return (
    <Box
      twClassName={`w-full overflow-hidden ${transparent ? '' : 'bg-muted'} ${roundedClassName}`}
      style={{ aspectRatio }}
    >
      {!hasFailed && (
        <Image
          source={source}
          style={tw.style('h-full w-full')}
          contentFit="contain"
          placeholder={placeholder}
          placeholderContentFit="contain"
          transition={isPreviewReady ? 150 : 0}
          recyclingKey={uri ?? preview}
          cachePolicy="memory-disk"
          onLoad={handleLoad}
          onError={handleError}
          accessibilityLabel={accessibilityLabel}
          testID={testID}
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
