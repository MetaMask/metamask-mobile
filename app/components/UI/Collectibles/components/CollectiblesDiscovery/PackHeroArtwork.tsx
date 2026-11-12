import React, { useState } from 'react';
import { Image, View, type ViewProps } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { PackArtwork } from '../../constants/packArtwork';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import { NativePackFoil } from './NativePackFoil';
import CollectiblesMotion from '../CollectiblesMotion/CollectiblesMotion';
import type { PackPresentationPose } from '../CollectiblesMotion/CollectiblesMotion.types';

/** One active foil host; all inactive catalogue and wheel items remain native images. */
export function PackHeroArtwork({
  artwork,
  name,
  height,
  active,
  pose,
  floating = true,
  onPress,
  captureId,
  pointerEvents = 'auto',
}: {
  artwork: PackArtwork;
  name: string;
  height: number;
  active: boolean;
  pose?: PackPresentationPose;
  floating?: boolean;
  captureId?: number;
  pointerEvents?: ViewProps['pointerEvents'];
  onPress?: (pose: PackPresentationPose) => void;
}) {
  const tw = useTailwind();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const { animate } = useCollectiblesPresentation();
  if (!animate || failed)
    return (
      <NativePackFoil source={artwork.image} name={name} height={height} />
    );
  const source = Image.resolveAssetSource(artwork.image);
  return (
    <View
      pointerEvents={pointerEvents}
      style={tw.style('self-center', { width: height * 0.6, height })}
    >
      {!ready && (
        <View pointerEvents="none" style={tw.style('absolute inset-0')}>
          <NativePackFoil source={artwork.image} name={name} height={height} />
        </View>
      )}
      <CollectiblesMotion
        configuration={{
          kind: 'pack',
          packCapture: captureId,
          identity: `${String(artwork.image)}-${floating}`,
          name,
          front: source?.uri ?? '',
          packFloating: floating,
          packFloatTime: pose?.time,
          packFloatTransform: floating ? undefined : pose?.transform,
        }}
        isActive={active}
        onError={() => setFailed(true)}
        onImageReady={() => setReady(true)}
        onPackPress={onPress}
        testID="collectibles-active-pack-foil"
      />
    </View>
  );
}
