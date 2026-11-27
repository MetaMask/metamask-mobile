import React, { useState, type ReactNode } from 'react';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { Image } from '../../primitives/Image';
import { View } from '../../primitives/View';
import { PackOpensBadge } from './PackOpensBadge';
import { ArtworkFallback } from './ArtworkFallback';

interface Props {
  code: string;
  openedCount: number;
  imageUrl?: string;
  className?: string;
  artClassName?: string;
  isBadgeAccessible?: boolean;
  badge?: ReactNode;
}

export function PackArt({
  code,
  openedCount,
  imageUrl,
  className = 'p-2',
  artClassName = 'h-56',
  isBadgeAccessible = true,
  badge,
}: Props) {
  const [failedImageUrl, setFailedImageUrl] = useState<string>();
  const hasArtFailed = failedImageUrl === imageUrl;

  return (
    <View className={`overflow-hidden rounded-xl bg-muted ${className}`}>
      {imageUrl && !hasArtFailed ? (
        <Image
          source={{ uri: imageUrl }}
          contentFit="contain"
          className={`w-full rounded-lg ${artClassName}`}
          onError={() => setFailedImageUrl(imageUrl)}
          testID={collectiblesTestIds.packsTileArt(code)}
        />
      ) : (
        <ArtworkFallback
          className={`w-full rounded-lg ${artClassName}`}
          testID={collectiblesTestIds.packsTileArtPlaceholder(code)}
        />
      )}
      {badge ? (
        <View className="absolute left-2 top-2">{badge}</View>
      ) : (
        <PackOpensBadge
          className="absolute left-2 top-2"
          code={code}
          openedCount={openedCount}
          isAccessible={isBadgeAccessible}
        />
      )}
    </View>
  );
}
