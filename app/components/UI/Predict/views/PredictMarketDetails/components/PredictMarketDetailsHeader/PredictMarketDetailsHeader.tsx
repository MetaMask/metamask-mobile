import React, { memo } from 'react';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../../../../../locales/i18n';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  HeaderSubpage,
  IconName,
  TextVariant,
} from '@metamask/design-system-react-native';
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
  onBackPress: () => void;
}

const PredictMarketDetailsHeader = memo(
  ({
    isLoading,
    market,
    title,
    image,
    onBackPress,
  }: PredictMarketDetailsHeaderProps) => {
    const tw = useTailwind();
    const insets = useSafeAreaInsets();

    if (isLoading) {
      return <PredictDetailsHeaderSkeleton />;
    }

    const imageUri = image || market?.image;

    return (
      <HeaderSubpage
        twClassName="min-h-14 h-auto bg-default justify-center"
        style={{ marginTop: insets.top }}
        startAccessory={
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={onBackPress}
            testID={PredictMarketDetailsSelectorsIDs.BACK_BUTTON}
            accessibilityLabel={strings('predict.buttons.back')}
          />
        }
        endAccessory={
          <PredictShareButton marketId={market?.id} marketSlug={market?.slug} />
        }
        avatar={
          <Box twClassName="w-10 h-10 rounded-lg bg-muted overflow-hidden">
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={tw.style('w-full h-full')}
                contentFit="cover"
              />
            ) : (
              <Box twClassName="w-full h-full bg-muted" />
            )}
          </Box>
        }
        title={title || market?.title || ''}
        titleProps={{ variant: TextVariant.HeadingMd }}
      />
    );
  },
);

PredictMarketDetailsHeader.displayName = 'PredictMarketDetailsHeader';

export default PredictMarketDetailsHeader;
