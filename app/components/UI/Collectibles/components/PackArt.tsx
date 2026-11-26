import React, { useState } from 'react';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { Image } from '../../primitives/Image';
import { View } from '../../primitives/View';
import { PackOpensBadge } from './PackOpensBadge';

interface Props {
  code: string;
  openedCount: number;
  imageUrl?: string;
  className?: string;
  artClassName?: string;
  isBadgeAccessible?: boolean;
}

export function PackArt({
  code,
  openedCount,
  imageUrl,
  className = 'p-2',
  artClassName = 'h-56',
  isBadgeAccessible = true,
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
        <View
          className={`w-full rounded-lg bg-alternative ${artClassName}`}
          testID={collectiblesTestIds.packsTileArtPlaceholder(code)}
        />
      )}
      <PackOpensBadge
        className="absolute left-2 top-2"
        code={code}
        openedCount={openedCount}
        isAccessible={isBadgeAccessible}
      />
    </View>
  );
}
