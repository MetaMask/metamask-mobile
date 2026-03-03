import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView } from 'react-native';
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
import { getFaviconUrl } from '../../utils/marketInsightsFormatting';

// Maximum number of source icons to show in the pill before "+N"
const MAX_VISIBLE_SOURCES = 4;

// SourceIcon renders a small circular favicon for a source.
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
      <Image
        source={{ uri: getFaviconUrl(source.url) }}
        style={tw.style('w-5 h-5 rounded-full')}
      />
    </Box>
  );
};

// MarketInsightsSourcesBottomSheet renders a scrollable list of all sources
const MarketInsightsSourcesBottomSheet: React.FC<
  MarketInsightsSourcesBottomSheetProps
> = ({ isVisible, onClose, sources }) => {
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

  const handleSourcePress = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  const uniqueSources = sources.reduce<MarketInsightsSource[]>(
    (acc, source) => {
      if (!acc.find((s) => s.name === source.name)) {
        acc.push(source);
      }
      return acc;
    },
    [],
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
        {uniqueSources.map((source) => (
          <Pressable
            key={source.name}
            onPress={() => handleSourcePress(source.url)}
            style={({ pressed }) =>
              tw.style(
                'flex-row items-center py-3 border-b border-muted',
                pressed && 'opacity-70',
              )
            }
          >
            <Box twClassName="w-8 h-8 rounded-full overflow-hidden mr-3">
              <Image
                source={{ uri: getFaviconUrl(source.url) }}
                style={tw.style('w-8 h-8 rounded-full')}
              />
            </Box>
            <Box twClassName="flex-1">
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {source.name}
              </Text>
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {source.type}
              </Text>
            </Box>
            <Icon
              name={IconName.Export}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </Pressable>
        ))}
      </ScrollView>
    </BottomSheet>
  );
};

const MarketInsightsSourcesFooter: React.FC<
  MarketInsightsSourcesFooterProps
> = ({ sources, testID }) => {
  const tw = useTailwind();
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

  const visibleCount = Math.min(sources.length, MAX_VISIBLE_SOURCES);
  const remainingCount = Math.max(sources.length - MAX_VISIBLE_SOURCES, 0);

  const handleOpenSources = useCallback(() => {
    setIsBottomSheetVisible(true);
  }, []);

  const handleCloseSources = useCallback(() => {
    setIsBottomSheetVisible(false);
  }, []);

  return (
    <>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 pt-3 pb-8"
        testID={testID}
      >
        <Pressable
          onPress={handleOpenSources}
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
          <Icon
            name={IconName.ThumbUp}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
          />
          <Icon
            name={IconName.ThumbDown}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
          />
        </Box>
      </Box>

      {isBottomSheetVisible && (
        <MarketInsightsSourcesBottomSheet
          isVisible={isBottomSheetVisible}
          onClose={handleCloseSources}
          sources={sources}
        />
      )}
    </>
  );
};

export default MarketInsightsSourcesFooter;
