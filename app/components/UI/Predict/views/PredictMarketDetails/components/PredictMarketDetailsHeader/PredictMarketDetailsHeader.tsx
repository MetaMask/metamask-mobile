import React, { memo } from 'react';
import { Image, Pressable } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../../../util/theme';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PredictMarketDetailsSelectorsIDs } from '../../../../Predict.testIds';
import PredictDetailsHeaderSkeleton from '../../../../components/PredictDetailsHeaderSkeleton';
import PredictShareButton from '../../../../components/PredictShareButton/PredictShareButton';
import type { PredictMarket } from '../../../../types';

export interface PredictMarketDetailsHeaderProps {
  isLoading: boolean;
  market: PredictMarket | null;
  title: string | undefined;
  image: string | undefined;
  titleLineCount: number;
  insetsTop: number;
  onBackPress: () => void;
}

const PredictMarketDetailsHeader = memo(
  ({
    isLoading,
    market,
    title,
    image,
    titleLineCount,
    insetsTop,
    onBackPress,
  }: PredictMarketDetailsHeaderProps) => {
    const { colors } = useTheme();
    const tw = useTailwind();

    if (isLoading) {
      return <PredictDetailsHeaderSkeleton />;
    }

    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        twClassName="gap-3 pb-4"
        style={{ paddingTop: insetsTop + 12 }}
      >
        <Box twClassName="flex-row items-center gap-3 px-1">
          <Pressable
            onPress={onBackPress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={strings('predict.buttons.back')}
            style={tw.style('items-center justify-center rounded-full')}
            testID={PredictMarketDetailsSelectorsIDs.BACK_BUTTON}
          >
            <Icon
              name={IconName.ArrowLeft}
              size={IconSize.Lg}
              color={colors.icon.default}
            />
          </Pressable>
          <Box twClassName="w-10 h-10 rounded-lg bg-muted overflow-hidden">
            {image || market?.image ? (
              <Image
                source={{ uri: image || market?.image }}
                style={tw.style('w-full h-full')}
                resizeMode="cover"
              />
            ) : (
              <Box twClassName="w-full h-full bg-muted" />
            )}
          </Box>
        </Box>
        <Box
          twClassName="flex-1 min-h-[40px]"
          justifyContent={
            titleLineCount >= 2 ? undefined : BoxJustifyContent.Center
          }
          style={titleLineCount >= 2 ? tw.style('mt-[-5px]') : undefined}
        >
          <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
            {title || market?.title || ''}
          </Text>
        </Box>
        <Box twClassName="pr-2">
          <PredictShareButton marketId={market?.id} marketSlug={market?.slug} />
        </Box>
      </Box>
    );
  },
);

PredictMarketDetailsHeader.displayName = 'PredictMarketDetailsHeader';

export default PredictMarketDetailsHeader;
