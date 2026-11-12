import type { NativeGesture } from 'react-native-gesture-handler';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { typography } from '@metamask/design-tokens';
import { strings } from '../../../../../../locales/i18n';
import type { CollectiblesPack } from '../../types';
import { formatUsd } from '../../providers/pack-partner/utils/format';
import { getCollectiblesPackArtwork } from '../../constants/packArtwork';
import {
  canonicalPackCategory,
  packTierNumber,
  packHeroTitle,
} from '../../utils/packClassification';
import ReplitPackWheel from '../../components/CollectiblesDiscovery/ReplitPackWheel';
import PackGalaxy from '../../components/CollectiblesDiscovery/PackGalaxy';
import { getPackDiscoveryGroup } from '../CollectiblesHome/CollectiblesHome.utils';

/** PackDetailHero geometry and the same Replit wheel; swiping only changes the viewed pack. */
export default function CollectiblesPackHero({
  pack,
  packs,
  height,
  active,
  animate,
  hidden,
  layoutReady = true,
  onSelect,
  destinationRef,
  onMeasure,
  scrollGesture,
}: {
  pack: CollectiblesPack;
  packs: CollectiblesPack[];
  height: number;
  active: boolean;
  animate: boolean;
  hidden: boolean;
  layoutReady?: boolean;
  onSelect: (pack: CollectiblesPack) => void;
  destinationRef: React.RefObject<View | null>;
  onMeasure: () => void;
  scrollGesture: NativeGesture;
}) {
  const tw = useTailwind();
  const { width, fontScale } = useWindowDimensions();
  const infoHeight =
    44 +
    fontScale *
      (typography.sBodyXS.lineHeight +
        typography.sHeadingLG.lineHeight +
        typography.sBodyMD.lineHeight +
        typography.sBodySM.lineHeight);
  const stageHeight = Math.max(280, height - infoHeight);
  const artworkHeight = Math.min(stageHeight * 0.92, width * 1.4);
  const category =
    canonicalPackCategory(pack.code, pack.category ?? undefined, pack.name) ??
    pack.category;
  const tier = packTierNumber(pack.price);
  const artwork = getCollectiblesPackArtwork(`pack_partner:${pack.code}`);
  const name = packHeroTitle(artwork.name, pack.name, category);
  const selection = useRef({ packs, onSelect, code: pack.code });
  selection.current = { packs, onSelect, code: pack.code };
  const acknowledgedCode = useRef(pack.code);
  const pendingSelections = useRef<string[]>([]);
  const [externalSelection, setExternalSelection] = useState(0);
  useLayoutEffect(() => {
    if (acknowledgedCode.current === pack.code) return;
    acknowledgedCode.current = pack.code;
    const acknowledgement = pendingSelections.current.indexOf(pack.code);
    if (acknowledgement >= 0) {
      // Navigation may coalesce several nearest-pack updates from one gesture.
      pendingSelections.current.splice(0, acknowledgement + 1);
    } else {
      // An external detail navigation must center its own pack, without resetting
      // the wheel for the route updates produced by its own active swipe.
      pendingSelections.current = [];
      setExternalSelection((value) => value + 1);
    }
  }, [pack.code]);
  const selectIndex = useCallback((index: number) => {
    const current = selection.current;
    const next = current.packs[index];
    if (next && next.code !== current.code) {
      if (pendingSelections.current.at(-1) !== next.code)
        pendingSelections.current.push(next.code);
      current.onSelect(next);
    }
  }, []);
  const stats = [
    [
      strings('collectibles.pack_detail.buyback'),
      `${pack.instantBuybackPercent}%`,
    ],
    [
      strings('collectibles.pack_detail.average_value'),
      pack.expectedValue === undefined ? '—' : formatUsd(pack.expectedValue),
    ],
    [
      strings('collectibles.pack_detail.maximum_value'),
      formatUsd(pack.maxValue),
    ],
  ];
  return (
    <Box
      twClassName="relative overflow-hidden"
      style={tw.style(layoutReady ? 'opacity-100' : 'opacity-0', {
        minHeight: height,
      })}
      pointerEvents={layoutReady ? 'auto' : 'none'}
      testID="collectibles-pack-detail-hero"
    >
      <PackGalaxy color={artwork.glowColor} />
      <Box style={{ height: stageHeight }}>
        <Box style={tw.style(hidden ? 'opacity-0' : 'opacity-100')}>
          <ReplitPackWheel
            scrollGesture={scrollGesture}
            key={`${getPackDiscoveryGroup(pack)}:${externalSelection}`}
            packs={packs}
            initialIndex={Math.max(
              0,
              packs.findIndex((item) => item.code === pack.code),
            )}
            height={stageHeight}
            slotRatio={0.69}
            active={active && !hidden}
            animate={animate}
            onSelect={selectIndex}
          />
        </Box>
        <View
          pointerEvents="none"
          ref={destinationRef}
          collapsable={false}
          onLayout={onMeasure}
          style={tw.style('absolute', {
            width: artworkHeight * 0.6,
            height: artworkHeight,
            top: (stageHeight - artworkHeight) / 2,
            left: (width - artworkHeight * 0.6) / 2,
          })}
        />
      </Box>
      <Box paddingTop={2}>
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          numberOfLines={1}
        >
          {category || '\u00a0'}
          {tier === undefined
            ? ''
            : ` · ${strings('collectibles_discovery.pack_tier', { number: tier })}`}
        </Text>
        <Text
          variant={TextVariant.HeadingLg}
          twClassName="text-center px-4"
          numberOfLines={1}
        >
          {name}
        </Text>
        <Box twClassName="flex-row px-4 py-3">
          {stats.map(([label, value], index) => (
            <Box
              key={label}
              twClassName={`flex-1 items-center gap-1 px-1 ${index < 2 ? 'border-r border-muted' : ''}`}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Bold}
                numberOfLines={1}
              >
                {value}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
