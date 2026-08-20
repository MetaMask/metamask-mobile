import React, { useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  SectionHeader,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { Article, MarketInsightsSource } from '@metamask/ai-controllers';
import type { WhatsHappeningItem } from '../../../UI/WhatsHappening/types';
import type { WhatsHappeningSourceValue } from '../../../UI/WhatsHappening/constants';
import { useTradablePerpsMarketSymbols } from '../../../UI/WhatsHappening/hooks';
import { isRelatedAssetTradable } from '../../../UI/WhatsHappening/util/tradableAssets';
import { strings } from '../../../../../locales/i18n';
import {
  getImpactLabel,
  getImpactTagSeverity,
} from '../../../UI/WhatsHappening/util/impact';
import {
  formatRelativeTime,
  getUniqueSourcesByFavicon,
} from '../../../UI/MarketInsights/utils/marketInsightsFormatting';
import SourceLogoGroup from '../../../UI/MarketInsights/components/SourceLogoGroup';
import PerpsRow from './PerpsRow';
import { useWhatsHappeningAssetPrices } from '../hooks/useWhatsHappeningAssetPrices';
import { colorWithOpacity } from '../../../../util/colors';

interface WhatsHappeningExpandedCardProps {
  item: WhatsHappeningItem;
  cardIndex: number;
  cardWidth: number;
  /** Height of the carousel container — used to give every card the same fixed height. */
  cardHeight: number;
  source: WhatsHappeningSourceValue;
  /**
   * Called when the user taps the sources row. The parent is responsible
   * for rendering the bottom sheet so it is anchored to the screen root rather
   * than the card's positioning context.
   */
  onSourcesPress?: (articles: Article[]) => void;
}

const WhatsHappeningExpandedCard: React.FC<WhatsHappeningExpandedCardProps> = ({
  item,
  cardIndex,
  cardWidth,
  cardHeight,
  source,
  onSourcesPress,
}) => {
  const tw = useTailwind();

  const impactLabel = getImpactLabel(item.impact);
  const impactSeverity = getImpactTagSeverity(item.impact);

  const uniqueSources = useMemo(() => {
    const sources: MarketInsightsSource[] = item.articles.map((article) => ({
      name: article.source,
      type: 'news' as const,
      url: article.url || article.source,
    }));
    return getUniqueSourcesByFavicon(sources);
  }, [item.articles]);

  const sourceLabel = useMemo(() => {
    const first = uniqueSources[0];
    if (!first) return null;
    const remaining = Math.max(0, uniqueSources.length - 1);
    return remaining > 0 ? `${first.name} +${remaining}` : first.name;
  }, [uniqueSources]);

  const formattedDate = useMemo(
    () => (item.date ? formatRelativeTime(item.date, { nowLabel: 'now' }) : ''),
    [item.date],
  );

  const { tradableSymbols } = useTradablePerpsMarketSymbols();

  const tradableRelatedAssets = useMemo(
    () =>
      item.relatedAssets.filter((a) =>
        isRelatedAssetTradable(a, tradableSymbols),
      ),
    [item.relatedAssets, tradableSymbols],
  );

  const { perpsPriceBySymbol } = useWhatsHappeningAssetPrices(
    tradableRelatedAssets,
  );

  const scrollBottomFadeColors = useMemo((): string[] => {
    const sectionColor =
      tw.color('bg-section') ?? tw.color('bg-default') ?? 'transparent';
    return [colorWithOpacity(sectionColor, 0), sectionColor];
  }, [tw]);

  return (
    <Box style={{ width: cardWidth, height: cardHeight }}>
      {/* Card surface */}
      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="rounded-2xl bg-section overflow-hidden flex-1 mt-4"
      >
        {/* Scroll region with a persistent bottom fade hinting at more content */}
        <Box
          flexDirection={BoxFlexDirection.Column}
          twClassName="relative flex-1 min-h-0 bg-section"
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={tw.style('flex-1 bg-section')}
            contentContainerStyle={tw.style('pt-6 pb-5')}
          >
            <Box gap={3} twClassName="px-4">
              {(item.impact || item.isOutdated) && (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={2}
                  twClassName="flex-wrap"
                >
                  {item.impact ? (
                    <Tag severity={impactSeverity}>{impactLabel}</Tag>
                  ) : null}

                  {item.isOutdated ? (
                    <Tag severity={TagSeverity.Warning}>
                      {strings('whats_happening.outdated')}
                    </Tag>
                  ) : null}
                </Box>
              )}

              <Text
                variant={TextVariant.HeadingLg}
                color={TextColor.TextDefault}
              >
                {item.title}
              </Text>

              {item.description ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {item.description}
                </Text>
              ) : null}
            </Box>

            {tradableRelatedAssets.length > 0 && (
              <Box twClassName="mt-4">
                <SectionHeader
                  title={strings('homepage.sections.related_assets')}
                />

                {tradableRelatedAssets.map((asset, index) => (
                  <PerpsRow
                    key={`${asset.symbol}-${index}`}
                    asset={asset}
                    item={item}
                    cardIndex={cardIndex}
                    source={source}
                    perpsPriceBySymbol={perpsPriceBySymbol}
                  />
                ))}
              </Box>
            )}
          </ScrollView>

          <LinearGradient
            pointerEvents="none"
            colors={scrollBottomFadeColors}
            style={tw.style('absolute left-0 right-0 bottom-0 h-10')}
          />
        </Box>

        {/* Sticky source / timestamp footer */}
        {uniqueSources.length > 0 && (
          <Pressable
            onPress={() => onSourcesPress?.(item.articles)}
            accessibilityRole="button"
          >
            {({ pressed }) => (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                gap={2}
                twClassName={`px-4 py-3 bg-section border-t border-muted${
                  pressed ? ' opacity-60' : ''
                }`}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={2}
                  twClassName="flex-shrink"
                >
                  <SourceLogoGroup sources={uniqueSources} />
                  {sourceLabel ? (
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                      numberOfLines={1}
                    >
                      {sourceLabel}
                    </Text>
                  ) : null}
                </Box>

                {formattedDate ? (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    numberOfLines={1}
                    twClassName="shrink-0"
                  >
                    {formattedDate}
                  </Text>
                ) : null}
              </Box>
            )}
          </Pressable>
        )}
      </Box>
    </Box>
  );
};

export default WhatsHappeningExpandedCard;
