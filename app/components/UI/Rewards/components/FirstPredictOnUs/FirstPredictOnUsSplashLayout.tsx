import React from 'react';
import { Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { FirstPredictOnUsDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import RewardsThemeImageComponent from '../ThemeImageComponent/RewardsThemeImageComponent';
import FirstPredictOnUsLegalFooter from './FirstPredictOnUsLegalFooter';
import FirstPredictOnUsMarketsCarousel from './FirstPredictOnUsMarketsCarousel';
import { FIRST_PREDICT_ON_US_CMS_KEYS } from './constants';
import type { PredictMarket } from '../../../Predict/types';

const SMALL_SCREEN_HEIGHT = 700;
const DEFAULT_HERO_HEIGHT = 320;
const SMALL_HERO_HEIGHT = 200;

interface FirstPredictOnUsSplashLayoutProps {
  content: FirstPredictOnUsDto;
  markets: PredictMarket[];
  onSkip: () => void;
}

const FirstPredictOnUsSplashLayout: React.FC<
  FirstPredictOnUsSplashLayoutProps
> = ({ content, markets, onSkip }) => {
  const tw = useTailwind();
  const { height: screenHeight } = useWindowDimensions();
  const heroHeight =
    screenHeight < SMALL_SCREEN_HEIGHT
      ? SMALL_HERO_HEIGHT
      : DEFAULT_HERO_HEIGHT;

  const skipText =
    content.localizedText[FIRST_PREDICT_ON_US_CMS_KEYS.splashSkip] ?? '';
  const description =
    content.localizedText[FIRST_PREDICT_ON_US_CMS_KEYS.splashDescription] ?? '';
  const confirmLabel =
    content.localizedText[FIRST_PREDICT_ON_US_CMS_KEYS.tradeConfirm] ?? '';
  const tradePlacedLabel =
    content.localizedText[FIRST_PREDICT_ON_US_CMS_KEYS.tradePlaced] ?? '';
  const tradeDescriptionTemplate =
    content.localizedText[FIRST_PREDICT_ON_US_CMS_KEYS.tradeDescription] ?? '';

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <ScrollView
        testID="first-predict-on-us-splash"
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('flex-grow pb-6')}
        showsVerticalScrollIndicator={false}
      >
        <Box twClassName="flex-1">
          <Box twClassName="flex-row items-center justify-between p-4">
            <Box twClassName="w-12" />
            <Pressable
              testID="first-predict-on-us-splash-skip"
              onPress={onSkip}
              hitSlop={12}
            >
              <Text
                variant={TextVariant.BodyLg}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {skipText}
              </Text>
            </Pressable>
          </Box>

          {content.image ? (
            <RewardsThemeImageComponent
              themeImage={content.image}
              resizeMode="cover"
              style={tw.style('w-full', { height: heroHeight })}
            />
          ) : null}

          <Text
            testID="first-predict-on-us-splash-description"
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="p-4"
          >
            {description}
          </Text>

          <Box twClassName="px-4">
            <FirstPredictOnUsMarketsCarousel
              confirmLabel={confirmLabel}
              markets={markets}
              tradeDescriptionTemplate={tradeDescriptionTemplate}
              tradePlacedLabel={tradePlacedLabel}
              usdAmount={content.usdAmount}
            />
          </Box>

          <Box twClassName="mt-4 px-4">
            <FirstPredictOnUsLegalFooter
              regionText={
                content.localizedText[FIRST_PREDICT_ON_US_CMS_KEYS.splashRegion]
              }
              termsText={
                content.localizedText[
                  FIRST_PREDICT_ON_US_CMS_KEYS.splashTermsApply
                ]
              }
              termsUrl={content.termsUrl}
            />
          </Box>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FirstPredictOnUsSplashLayout;
