import React from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import {
  usePackInsights,
  usePackSocialContext,
} from '../../hooks/useCollectiblesDiscovery';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import { PACK_PARTNER_RARITIES } from '../../providers/pack-partner/constants';
import type { CollectiblesPack, CollectiblesOpening } from '../../types';
import { formatUsd } from '../../providers/pack-partner/utils/format';
import { DiscoveryCard } from '../../components/CollectiblesDiscovery/DiscoveryCard';
import { RARITY_COLORS } from '../../components/RarityTag/RarityTag.constants';
import { getCardSummaryHeight } from '../../components/CardDisplay/CardSummary';
import { CollectiblesPackDetailTestIds as IDs } from '../../Collectibles.testIds';
import PackSocialSummary from '../../components/CollectiblesDiscovery/PackSocialSummary';

/** Public winners stay separate from wallet history and owned cards. */
export function PackJustOpened({
  cards,
  onPause,
  onResume,
  onSelect,
  emptyContent,
}: {
  cards: CollectiblesOpening[];
  onPause: () => void;
  onResume: () => void;
  onSelect: (card: CollectiblesOpening) => void;
  emptyContent: React.ReactNode;
}) {
  const tw = useTailwind();
  const { width, fontScale } = useWindowDimensions();
  // Each 160pt tile has 8pt padding and a 2:3 image. Keep this space even
  // while the selected pack's public openings request has not returned.
  const rowHeight = 16 + (144 * 3) / 2 + getCardSummaryHeight(fontScale);
  const { previewCount } = useCollectiblesPresentation();
  return (
    <Box paddingTop={5} gap={3} testID="collectibles-pack-just-opened">
      <Box twClassName="flex-row items-center justify-between px-5">
        <Text variant={TextVariant.HeadingMd}>
          {strings('collectibles.pack_detail.just_opened')}
        </Text>
      </Box>
      <FlatList
        horizontal
        onScrollBeginDrag={onPause}
        onScroll={({ nativeEvent }) => {
          if (nativeEvent.contentOffset.x >= 4) onPause();
        }}
        onScrollEndDrag={({ nativeEvent }) => {
          if (nativeEvent.contentOffset.x < 4) onResume();
        }}
        onMomentumScrollEnd={({ nativeEvent }) => {
          if (nativeEvent.contentOffset.x < 4) onResume();
        }}
        scrollEventThrottle={16}
        data={cards}
        keyExtractor={(card) => card.id}
        initialNumToRender={previewCount}
        maxToRenderPerBatch={previewCount}
        windowSize={3}
        showsHorizontalScrollIndicator={false}
        style={{ minHeight: rowHeight }}
        contentContainerStyle={tw.style('px-5 gap-3')}
        ListEmptyComponent={
          <Box
            twClassName="justify-center"
            style={{ width: Math.max(0, width - 40), minHeight: rowHeight }}
          >
            {emptyContent}
          </Box>
        }
        renderItem={({ item }) => (
          <Box twClassName="w-40">
            <DiscoveryCard
              card={item}
              onPress={() => onSelect(item)}
              testID={IDs.OPENING(item.id)}
            />
          </Box>
        )}
        testID="collectibles-pack-openings-list"
      />
    </Box>
  );
}

/** Provider-published probabilities are independent from indexed statistics. */
export function PackRarityMetrics({ pack }: { pack: CollectiblesPack }) {
  const percent = getIntlNumberFormatter(I18n.locale, {
    style: 'percent',
    maximumSignificantDigits: 4,
  });
  return (
    <Box padding={5} gap={3} testID="collectibles-pack-rarity-metrics">
      <Text variant={TextVariant.HeadingMd}>
        {strings('collectibles.pack_detail.rarity_metrics')}
      </Text>
      {[...PACK_PARTNER_RARITIES].reverse().map((rarity) => (
        <Box
          key={rarity}
          twClassName="flex-row items-center justify-between gap-2 min-h-10"
        >
          <Box twClassName="flex-row items-center gap-2">
            <Box
              twClassName="h-2 w-2 rounded-full"
              style={{ backgroundColor: RARITY_COLORS[rarity] }}
            />
            <Text variant={TextVariant.BodyMd}>
              {strings(`collectibles.rarity.${rarity}`)}
              <Text color={TextColor.TextAlternative}> · </Text>
              <Text fontWeight={FontWeight.Bold}>
                {percent.format(pack.odds[rarity])}
              </Text>
            </Text>
          </Box>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Bold}
            twClassName="shrink text-right"
            numberOfLines={1}
          >
            {pack.tierRanges
              ? `${formatUsd(pack.tierRanges[rarity].start)} – ${formatUsd(pack.tierRanges[rarity].end)}`
              : '—'}
          </Text>
        </Box>
      ))}
      <Box twClassName="flex-row items-center justify-between min-h-10">
        <Text>{strings('collectibles.pack_detail.cards_per_pack')}</Text>
        <Text fontWeight={FontWeight.Bold}>1</Text>
      </Box>
    </Box>
  );
}

/** Batched pack activity never controls buying. */
export function PackDiscoveryContext({ packCode }: { packCode: string }) {
  const packType = `pack_partner:${packCode}`;
  const { data: insights } = usePackInsights([packType]);
  const insight = insights?.[packType];
  return (
    <Box padding={5} gap={4} testID="collectibles-pack-insights">
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {strings('collectibles.pack_detail.activity')}
      </Text>
      <Box twClassName="items-center py-3" gap={1}>
        <Text variant={TextVariant.DisplayLg} numberOfLines={1}>
          {insight?.pulledSinceLastEpic ?? '—'}
        </Text>
        <Text color={TextColor.TextAlternative} twClassName="text-center">
          {strings('collectibles.pack_detail.since_epic')}
        </Text>
      </Box>
      <Box twClassName="flex-row">
        {[...PACK_PARTNER_RARITIES].reverse().map((rarity) => (
          <Box
            key={rarity}
            twClassName="flex-1 items-center gap-1 border-r border-muted px-1"
          >
            <Text fontWeight={FontWeight.Bold} numberOfLines={1}>
              {insight?.rarityCounts24h[rarity] ?? '—'}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings(`collectibles.rarity.${rarity}`)}
            </Text>
          </Box>
        ))}
      </Box>
      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {strings('collectibles.pack_detail.pulled_24h')}
      </Text>
    </Box>
  );
}

/** Pack activity stays next to the fixed Open action, as in Replit PackDetailSocialContext. */
export function PackSocialFooter({
  packCode,
  onProfile,
}: {
  packCode: string;
  onProfile: (profileId: string) => void;
}) {
  const packType = `pack_partner:${packCode}`;
  const { data } = usePackSocialContext([packType]);
  const context = data?.[packType];
  return (
    <Box
      twClassName="flex-row items-center justify-center gap-2 pb-1"
      testID="collectibles-pack-social-footer"
    >
      <PackSocialSummary context={context} onProfile={onProfile} />
    </Box>
  );
}
