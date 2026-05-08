import React, { useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { Article, MarketInsightsSource } from '@metamask/ai-controllers';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
import { strings } from '../../../../../locales/i18n';
import {
  getImpactLabel,
  getImpactBackgroundClass,
  getImpactTextColor,
} from '../../Homepage/Sections/WhatsHappening/util/impact';
import {
  formatRelativeTime,
  getUniqueSourcesByFavicon,
} from '../../../UI/MarketInsights/utils/marketInsightsFormatting';
import SourceLogoGroup from '../../../UI/MarketInsights/components/SourceLogoGroup';
import PerpsRow from './PerpsRow';
import { useWhatsHappeningAssetPrices } from '../hooks/useWhatsHappeningAssetPrices';

interface WhatsHappeningExpandedCardProps {
  item: WhatsHappeningItem;
  cardIndex: number;
  cardWidth: number;
  /** Height of the carousel container — used to give every card the same fixed height. */
  cardHeight: number;
  /**
   * Called when the user taps the sources footer row. The parent is responsible
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
  onSourcesPress,
}) => {
  const tw = useTailwind();

  const impactLabel = getImpactLabel(item.impact);
  const impactBgClass = getImpactBackgroundClass(item.impact);
  const impactTextColor = getImpactTextColor(item.impact);

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

  const { perpsPriceBySymbol } = useWhatsHappeningAssetPrices(item);

  return (
    <Box style={{ width: cardWidth, height: cardHeight }}>
      {/* Card surface — fills the fixed height so all cards are the same size */}
      <Box twClassName="rounded-2xl bg-background-muted overflow-hidden flex-1 mt-4">
        {/* Scrollable main content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pt-7 px-5 pb-5 gap-4')}
        >
          {/* Tag row: AI pill + impact badge */}
          {item.impact && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
              twClassName="flex-wrap"
            >
              {/* AI pill — inverted (white bg, dark content) */}
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={1}
                twClassName="bg-icon-default rounded px-1.5 py-1 self-start"
              >
                <Icon
                  name={IconName.Sparkle}
                  size={IconSize.Md}
                  twClassName="text-icon-inverse"
                />
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  twClassName="text-icon-inverse"
                >
                  {strings('homepage.sections.whats_happening_ai')}
                </Text>
              </Box>

              <Box
                twClassName={`${impactBgClass} rounded px-2 py-1 self-start`}
              >
                <Text variant={TextVariant.BodySm} color={impactTextColor}>
                  {impactLabel}
                </Text>
              </Box>
            </Box>
          )}

          {/* Title */}
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {item.title}
          </Text>

          {/* Description */}
          {item.description && (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {item.description}
            </Text>
          )}

          {/* Markets section — all related assets are perps markets */}
          {item.relatedAssets.length > 0 && (
            <Box gap={1}>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {strings('homepage.sections.markets')}
              </Text>

              {item.relatedAssets.map((asset) => (
                <PerpsRow
                  key={asset.sourceAssetId}
                  asset={asset}
                  item={item}
                  cardIndex={cardIndex}
                  perpsPriceBySymbol={perpsPriceBySymbol}
                />
              ))}
            </Box>
          )}
        </ScrollView>

        {/* Fixed sources footer — always pinned to the bottom of the card */}
        {uniqueSources.length > 0 && (
          <Box twClassName="px-5 pb-5" gap={4}>
            <Box twClassName="h-px bg-border-muted" />

            <Pressable
              onPress={() => onSourcesPress?.(item.articles)}
              accessibilityRole="button"
            >
              {({ pressed }) => (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Between}
                  twClassName={pressed ? 'opacity-60' : ''}
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    gap={2}
                  >
                    <SourceLogoGroup sources={uniqueSources} />
                    {sourceLabel ? (
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {sourceLabel}
                      </Text>
                    ) : null}
                  </Box>

                  {item.date ? (
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {formatRelativeTime(item.date, { nowLabel: 'now' })}
                    </Text>
                  ) : null}
                </Box>
              )}
            </Pressable>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default WhatsHappeningExpandedCard;
