import type { NativeGesture } from 'react-native-gesture-handler';
import { getCollectiblesPackArtwork } from '../../constants/packArtwork';
import type { PackHeroSource } from './PackHeroFlight.geometry';
import React, { useCallback, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { typography } from '@metamask/design-tokens';

import {
  Box,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { CollectiblesPack } from '../../types';
import ReplitPackWheel from './ReplitPackWheel';
import CtaButton from '../CtaButton';
import { formatUsd } from '../../providers/pack-partner/utils/format';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import type { PackSocialContext } from '../../services/clients/CollectiblesSocialApiClient';
import PackSocialSummary from './PackSocialSummary';
import PackGalaxy from './PackGalaxy';
import { CollectiblesCarouselTestIds } from '../../Collectibles.testIds';
import {
  canonicalPackCategory,
  packTierNumber,
  packHeroTitle,
} from '../../utils/packClassification';

/** Reserve the wheel and each metadata/action row while the catalogue loads. */
export const PopularPackCarouselSkeleton = (): React.JSX.Element => {
  const { width, fontScale } = useWindowDimensions();
  return (
    <Box paddingBottom={4} gap={2}>
      <Skeleton height={width * 0.9 + 20} width="100%" />
      <Box paddingHorizontal={4} gap={1} twClassName="items-center">
        <Skeleton
          height={typography.sBodyXS.lineHeight * fontScale}
          width="35%"
        />
        <Skeleton
          height={typography.sHeadingMD.lineHeight * fontScale}
          width="75%"
        />
        <Skeleton
          height={Math.max(24, typography.sBodyXS.lineHeight * fontScale)}
          width={180}
        />
        <Box paddingTop={4} twClassName="w-full">
          <Skeleton height={48} width="100%" twClassName="rounded-full" />
        </Box>
      </Box>
    </Box>
  );
};

/** Replit's snapping pack wheel; presentation constraints never filter its catalogue. */
export default function PopularPackCarousel({
  packs,
  onOpenPack,
  onBuyPack,
  social,
  onProfile,
  active = true,
  socialLoading = false,
  scrollGesture,
}: {
  packs: CollectiblesPack[];
  onOpenPack: (pack: CollectiblesPack, source?: PackHeroSource) => void;
  onBuyPack: (pack: CollectiblesPack) => void;
  social?: Record<string, PackSocialContext>;
  onProfile?: (profileId: string) => void;
  active?: boolean;
  socialLoading?: boolean;
  scrollGesture: NativeGesture;
}) {
  const { animate } = useCollectiblesPresentation();
  const [selectedCode, setSelectedCode] = useState(packs[0]?.code);
  const selectedIndex = Math.max(
    0,
    packs.findIndex((pack) => pack.code === selectedCode),
  );
  const selected = packs[selectedIndex];
  const currentPacks = useRef(packs);
  currentPacks.current = packs;
  const selectPack = useCallback((index: number) => {
    const next = currentPacks.current[index];
    if (next) setSelectedCode(next.code);
  }, []);
  if (selected?.code !== selectedCode) setSelectedCode(selected?.code);
  if (!selected) return null;
  const packType = `pack_partner:${selected.code}`;
  const context = social?.[packType];
  const artwork = getCollectiblesPackArtwork(`pack_partner:${selected.code}`);
  const category =
    canonicalPackCategory(
      selected.code,
      selected.category ?? undefined,
      selected.name,
    ) ?? selected.category;
  const tier = packTierNumber(selected.price);
  return (
    <Box
      paddingBottom={4}
      gap={2}
      twClassName="relative overflow-hidden"
      testID={CollectiblesCarouselTestIds.CONTAINER}
    >
      <PackGalaxy color={artwork.glowColor} />
      <ReplitPackWheel
        scrollGesture={scrollGesture}
        // Only actual catalogue changes rebuild the wheel; metadata updates
        // keep its native responder and in-flight gesture state intact.
        key={JSON.stringify(packs.map((pack) => pack.code))}
        packs={packs}
        initialIndex={selectedIndex}
        animate={animate}
        active={active}
        onSelect={selectPack}
        onOpen={onOpenPack}
      />
      <Box paddingHorizontal={4} gap={1}>
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
          variant={TextVariant.HeadingMd}
          twClassName="text-center"
          numberOfLines={1}
        >
          {packHeroTitle(artwork.name, selected.name, category)}
        </Text>
        <PackSocialSummary
          context={context}
          onProfile={onProfile}
          isLoading={socialLoading}
        />
        <Box paddingTop={4}>
          <CtaButton
            label={strings('collectibles_discovery.open_for', {
              amount: formatUsd(selected.price),
            })}
            onPress={() => onBuyPack(selected)}
            testID={CollectiblesCarouselTestIds.BUY}
          />
        </Box>
      </Box>
    </Box>
  );
}
