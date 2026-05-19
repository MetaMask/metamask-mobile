import React, { useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
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
import type { WhatsHappeningItem } from '../../../UI/WhatsHappening/types';
import type { WhatsHappeningSourceValue } from '../../../UI/WhatsHappening/constants';
import { strings } from '../../../../../locales/i18n';
import {
  getImpactLabel,
  getImpactBackgroundClass,
  getImpactTextColor,
} from '../../../UI/WhatsHappening/util/impact';
import {
  formatRelativeTime,
  getUniqueSourcesByFavicon,
} from '../../../UI/MarketInsights/utils/marketInsightsFormatting';
import SourceLogoGroup from '../../../UI/MarketInsights/components/SourceLogoGroup';
import PerpsRow from './PerpsRow';
import { useWhatsHappeningAssetPrices } from '../hooks/useWhatsHappeningAssetPrices';
import { useTheme } from '../../../../util/theme';
import { AppThemeKey } from '../../../../util/theme/models';

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
  const { themeAppearance, colors } = useTheme();
  const isDarkMode = themeAppearance === AppThemeKey.dark;

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

  const formattedDate = useMemo(
    () => (item.date ? formatRelativeTime(item.date, { nowLabel: 'now' }) : ''),
    [item.date],
  );

  const { perpsPriceBySymbol } = useWhatsHappeningAssetPrices(
    item.relatedAssets,
  );

  const scrollBottomFadeColors = useMemo((): string[] => {
    if (isDarkMode) {
      return ['transparent', 'rgba(0,0,0,0.25)'];
    }
    const endColor =
      tw.color('bg-background-muted') ??
      tw.color('bg-default') ??
      colors.background.muted;
    return ['transparent', endColor];
  }, [tw, isDarkMode, colors.background.muted]);

  const aiPillContainerClass = isDarkMode
    ? 'bg-icon-default rounded px-1.5 py-1 self-start border border-transparent'
    : 'bg-default rounded px-1.5 py-1 self-start border border-text-default';
  const aiPillForegroundClass = isDarkMode
    ? 'text-icon-inverse'
    : 'text-icon-default';

  return (
    <Box style={{ width: cardWidth, height: cardHeight }}>
      {/* Card surface */}
      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="rounded-2xl bg-background-muted overflow-hidden flex-1 mt-4"
      >
        {/* Scroll region with a persistent bottom fade hinting at more content */}
        <Box
          flexDirection={BoxFlexDirection.Column}
          twClassName="relative flex-1 min-h-0"
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={tw.style('flex-1')}
            contentContainerStyle={tw.style('pt-7 px-5 pb-5 gap-4')}
          >
            {/* Tag row: AI pill + impact badge */}
            {item.impact && (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
                twClassName="flex-wrap"
              >
                {/* AI pill */}
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={1}
                  twClassName={aiPillContainerClass}
                >
                  <Icon
                    name={IconName.Sparkle}
                    size={IconSize.Md}
                    twClassName={aiPillForegroundClass}
                  />
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    twClassName={aiPillForegroundClass}
                  >
                    {strings('whats_happening.ai')}
                  </Text>
                </Box>

                <Box
                  twClassName={`${impactBgClass} rounded px-2 py-1 self-start border border-transparent`}
                >
                  <Text variant={TextVariant.BodySm} color={impactTextColor}>
                    {impactLabel}
                  </Text>
                </Box>
              </Box>
            )}

            {/* Title */}
            <Text
              variant={TextVariant.HeadingMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {item.title}
            </Text>

            {/* Description + sources */}
            {(item.description || uniqueSources.length > 0) && (
              <Box>
                {item.description && (
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {item.description}
                  </Text>
                )}

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
                        twClassName={
                          pressed ? 'pt-2 pb-4 opacity-60' : 'pt-2 pb-4'
                        }
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
            )}

            {/* Related assets section */}
            {item.relatedAssets.length > 0 && (
              <Box gap={1}>
                <Text
                  variant={TextVariant.HeadingSm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {strings('homepage.sections.related_assets')}
                </Text>

                {item.relatedAssets.map((asset) => (
                  <PerpsRow
                    key={asset.sourceAssetId}
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
      </Box>
    </Box>
  );
};

export default WhatsHappeningExpandedCard;
