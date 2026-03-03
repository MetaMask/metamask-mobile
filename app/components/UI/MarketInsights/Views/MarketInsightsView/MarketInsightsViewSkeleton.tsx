import React from 'react';
import { ScrollView, Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { MarketInsightsSelectorsIDs } from '../../MarketInsights.testIds';

interface MarketInsightsViewSkeletonProps {
  insets: { top: number; bottom: number };
  onBackPress: () => void;
}

const MarketInsightsViewSkeleton: React.FC<MarketInsightsViewSkeletonProps> = ({
  insets,
  onBackPress,
}) => {
  const tw = useTailwind();

  return (
    <Box
      twClassName={`flex-1 bg-default pt-[${insets.top}px]`}
      testID={MarketInsightsSelectorsIDs.VIEW_SKELETON}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-1 py-2"
      >
        <Pressable onPress={onBackPress} style={tw.style('p-2')} hitSlop={8}>
          <Icon
            name={IconName.ArrowLeft}
            size={IconSize.Md}
            color={IconColor.IconDefault}
          />
        </Pressable>
        <Box twClassName="flex-1 items-center">
          <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
            {strings('market_insights.title')}
          </Text>
        </Box>
        <Box twClassName="w-10" />
      </Box>

      <ScrollView
        contentContainerStyle={tw.style(`pb-[${insets.bottom + 16}px]`)}
        showsVerticalScrollIndicator={false}
      >
        <Box twClassName="px-4 pt-4 pb-3" gap={2}>
          <Skeleton height={28} width="90%" />
          <Skeleton height={28} width="62%" />
        </Box>

        <Box twClassName="px-4 pb-6" gap={2}>
          <Skeleton height={16} width="94%" />
          <Skeleton height={16} width="85%" />
          <Skeleton height={16} width="88%" />
          <Skeleton height={16} width="56%" />
        </Box>

        <Box twClassName="pb-6">
          <Box twClassName="px-4" gap={3}>
            <Skeleton height={64} width="100%" style={tw.style('rounded-xl')} />
            <Skeleton height={64} width="100%" style={tw.style('rounded-xl')} />
            <Skeleton height={64} width="100%" style={tw.style('rounded-xl')} />
          </Box>
        </Box>

        <Box twClassName="pb-6">
          <Box twClassName="px-4 py-4">
            <Skeleton height={16} width={150} />
          </Box>

          <Box twClassName="px-4" gap={3}>
            <Skeleton
              height={120}
              width="100%"
              style={tw.style('rounded-2xl bg-alternative')}
            />
            <Skeleton
              height={120}
              width="100%"
              style={tw.style('rounded-2xl bg-alternative')}
            />
          </Box>
        </Box>
      </ScrollView>
    </Box>
  );
};

export default MarketInsightsViewSkeleton;
