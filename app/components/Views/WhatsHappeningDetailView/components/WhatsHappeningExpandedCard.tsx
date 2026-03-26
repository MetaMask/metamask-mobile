import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { MarketInsightsSource } from '@metamask/ai-controllers';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
import { strings } from '../../../../../locales/i18n';
import {
  formatRelativeTime,
  getUniqueSourcesByFavicon,
} from '../../../UI/MarketInsights/utils/marketInsightsFormatting';
import SourceLogoGroup from '../../../UI/MarketInsights/components/SourceLogoGroup';
import TokenRow from './TokenRow';
import WhatsHappeningSourcesBottomSheet from './WhatsHappeningSourcesBottomSheet';

interface WhatsHappeningExpandedCardProps {
  item: WhatsHappeningItem;
  cardWidth: number;
  digestId: string | null;
}

const getImpactLabel = (impact: WhatsHappeningItem['impact']): string => {
  switch (impact) {
    case 'positive':
      return strings('homepage.sections.whats_happening_impact.bullish');
    case 'negative':
      return strings('homepage.sections.whats_happening_impact.bearish');
    default:
      return strings('homepage.sections.whats_happening_impact.neutral');
  }
};

const getImpactStyles = (
  impact: WhatsHappeningItem['impact'],
): { containerClass: string; textColor: TextColor } => {
  switch (impact) {
    case 'positive':
      return {
        containerClass: 'bg-success-muted rounded px-2 py-1 self-start',
        textColor: TextColor.SuccessDefault,
      };
    case 'negative':
      return {
        containerClass: 'bg-error-muted rounded px-2 py-1 self-start',
        textColor: TextColor.ErrorDefault,
      };
    default:
      return {
        containerClass: 'bg-muted rounded px-2 py-1 self-start',
        textColor: TextColor.TextAlternative,
      };
  }
};

const WhatsHappeningExpandedCard: React.FC<WhatsHappeningExpandedCardProps> = ({
  item,
  cardWidth,
  digestId,
}) => {
  const tw = useTailwind();
  const [sourcesVisible, setSourcesVisible] = useState(false);

  const impactLabel = getImpactLabel(item.impact);
  const impactStyles = getImpactStyles(item.impact);

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

  return (
    <Box style={{ width: cardWidth }} twClassName="flex-1">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-4 flex-grow')}
      >
        <Box
          twClassName="rounded-2xl bg-background-muted overflow-hidden flex-1"
          gap={4}
          padding={5}
        >
          {/* Impact badge */}
          <Box twClassName={impactStyles.containerClass}>
            <Text variant={TextVariant.BodySm} color={impactStyles.textColor}>
              {impactLabel}
            </Text>
          </Box>

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

          {/* Tokens section */}
          {item.relatedAssets.length > 0 && (
            <Box gap={1}>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                Tokens
              </Text>

              {item.relatedAssets.map((asset) => (
                <TokenRow
                  key={asset.sourceAssetId}
                  asset={asset}
                  digestId={digestId}
                />
              ))}
            </Box>
          )}

          {/* Sources trigger */}
          {uniqueSources.length > 0 && (
            <>
              <Box twClassName="h-px bg-border-muted" />

              <Pressable
                onPress={() => setSourcesVisible(true)}
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
            </>
          )}
        </Box>
      </ScrollView>

      {sourcesVisible && (
        <WhatsHappeningSourcesBottomSheet
          isVisible={sourcesVisible}
          onClose={() => setSourcesVisible(false)}
          articles={item.articles}
        />
      )}
    </Box>
  );
};

export default WhatsHappeningExpandedCard;
