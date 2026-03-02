import React, { useCallback, useEffect, useRef } from 'react';
import { Image, Pressable, ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Icon,
  IconName,
  IconSize,
  IconColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../../locales/i18n';
import type {
  MarketInsightsSourcesFooterProps,
  MarketInsightsSourcesBottomSheetProps,
} from './MarketInsightsSourcesFooter.types';
import type { MarketInsightsSource } from '@metamask/ai-controllers';
import {
  formatRelativeTime,
  getFaviconUrl,
  isXSourceUrl,
} from '../../utils/marketInsightsFormatting';
import { MarketInsightsSelectorsIDs } from '../../MarketInsights.testIds';

// Maximum number of source icons to show in the pill before "+N"
const MAX_VISIBLE_SOURCES = 4;

// SourceIcon renders a small circular favicon (or X icon) for a source.
const SourceIcon: React.FC<{
  source: MarketInsightsSource;
  index: number;
  isStacked?: boolean;
}> = ({ source, index, isStacked = false }) => {
  const tw = useTailwind();
  return (
    <Box
      twClassName={`w-5 h-5 rounded-full bg-default border border-muted overflow-hidden ${
        isStacked && index > 0 ? '-ml-2' : ''
      }`}
    >
      {isXSourceUrl(source.url) ? (
        <Box twClassName="w-5 h-5 items-center justify-center rounded-full">
          <Icon
            name={IconName.X}
            size={IconSize.Sm}
            color={IconColor.IconDefault}
          />
        </Box>
      ) : (
        <Image
          source={{ uri: getFaviconUrl(source.url) }}
          style={tw.style('w-5 h-5 rounded-full')}
        />
      )}
    </Box>
  );
};

// MarketInsightsSourcesBottomSheet renders a scrollable list of all sources
export const MarketInsightsSourcesBottomSheet: React.FC<
  MarketInsightsSourcesBottomSheetProps
> = ({ isVisible, onClose, sources, onSourcePress }) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    const sheet = bottomSheetRef.current;
    if (isVisible) {
      sheet?.onOpenBottomSheet();
    } else {
      sheet?.onCloseBottomSheet();
    }
  }, [isVisible]);

  const handleSourcePress = useCallback(
    (url: string) => {
      onSourcePress?.(url);
    },
    [onSourcePress],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      style={tw.style('max-h-[600px]')}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('market_insights.sources_title')}
        </Text>
      </BottomSheetHeader>
      <ScrollView
        style={tw.style('px-4')}
        contentContainerStyle={tw.style('pb-24')}
      >
        {sources.map((source, index) => (
          <Pressable
            key={`${source.url}-${index}`}
            onPress={() => handleSourcePress(source.url)}
            style={({ pressed }) =>
              tw.style(
                'flex-row items-start py-3 border-b border-muted',
                pressed && 'opacity-70',
              )
            }
          >
            <Box twClassName="flex-1">
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.End}
                twClassName="pr-1"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  twClassName="flex-1 pr-2"
                >
                  {source.headline ?? source.name}
                </Text>
                <Box twClassName="pb-1">
                  <Icon
                    name={IconName.Export}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                </Box>
              </Box>
              {source.headline ? (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="pt-1"
                >
                  <Box twClassName="w-4 h-4 rounded-full overflow-hidden mr-2 items-center justify-center">
                    {isXSourceUrl(source.url) ? (
                      <Icon
                        name={IconName.X}
                        size={IconSize.Sm}
                        color={IconColor.IconDefault}
                      />
                    ) : (
                      <Image
                        source={{ uri: getFaviconUrl(source.url) }}
                        style={tw.style('w-4 h-4 rounded-full')}
                      />
                    )}
                  </Box>
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
                  >
                    {source.name}
                  </Text>
                  {source.date ? (
                    <>
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {' • '}
                      </Text>
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {formatRelativeTime(source.date, { nowLabel: 'now' })}
                      </Text>
                    </>
                  ) : null}
                </Box>
              ) : (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="pt-1"
                >
                  <Box twClassName="w-4 h-4 rounded-full overflow-hidden mr-2 items-center justify-center">
                    {isXSourceUrl(source.url) ? (
                      <Icon
                        name={IconName.X}
                        size={IconSize.Sm}
                        color={IconColor.IconDefault}
                      />
                    ) : (
                      <Image
                        source={{ uri: getFaviconUrl(source.url) }}
                        style={tw.style('w-4 h-4 rounded-full')}
                      />
                    )}
                  </Box>
                  <Text
                    variant={TextVariant.BodyXs}
                    color={TextColor.TextAlternative}
                  >
                    {source.type}
                  </Text>
                </Box>
              )}
            </Box>
          </Pressable>
        ))}
      </ScrollView>
    </BottomSheet>
  );
};

const MarketInsightsSourcesFooter: React.FC<
  MarketInsightsSourcesFooterProps
> = ({ sources, onSourcesPress, onThumbsUp, onThumbsDown, testID }) => {
  const tw = useTailwind();

  const visibleCount = Math.min(sources.length, MAX_VISIBLE_SOURCES);
  const remainingCount = Math.max(sources.length - MAX_VISIBLE_SOURCES, 0);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4 pt-3 pb-3"
      testID={testID}
    >
      <Pressable
        onPress={onSourcesPress}
        style={({ pressed }) =>
          tw.style(
            'flex-row items-center bg-muted rounded-full px-3 py-2',
            pressed && 'opacity-70',
          )
        }
      >
        <Box flexDirection={BoxFlexDirection.Row} twClassName="pr-2">
          {sources.slice(0, visibleCount).map((source, index) => (
            <SourceIcon
              key={source.name}
              source={source}
              index={index}
              isStacked
            />
          ))}
        </Box>
        {remainingCount > 0 ? (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('market_insights.sources_count', {
              count: String(remainingCount),
            })}
          </Text>
        ) : null}
      </Pressable>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
      >
        <Pressable
          onPress={onThumbsUp}
          style={({ pressed }) => tw.style(pressed && 'opacity-70')}
          testID={MarketInsightsSelectorsIDs.THUMBS_UP_BUTTON}
        >
          <Icon
            name={IconName.ThumbUp}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
          />
        </Pressable>
        <Pressable
          onPress={onThumbsDown}
          style={({ pressed }) => tw.style(pressed && 'opacity-70')}
          testID={MarketInsightsSelectorsIDs.THUMBS_DOWN_BUTTON}
        >
          <Icon
            name={IconName.ThumbDown}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
          />
        </Pressable>
      </Box>
    </Box>
  );
};

export default MarketInsightsSourcesFooter;
