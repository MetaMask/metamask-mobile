import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { PredictMarket as PredictMarketType } from '../../types';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import Routes from '../../../../../constants/navigation/Routes';
import TrendingFeedSessionManager from '../../../Trending/services/TrendingFeedSessionManager';

interface PredictMarketSportProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
}

const PredictMarketSport: React.FC<PredictMarketSportProps> = ({
  market,
  testID,
  entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED,
}) => {
  const resolvedEntryPoint = TrendingFeedSessionManager.getInstance()
    .isFromTrending
    ? PredictEventValues.ENTRY_POINT.TRENDING
    : entryPoint;

  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const tw = useTailwind();

  return (
    <TouchableOpacity
      testID={testID}
      onPress={() => {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MARKET_DETAILS,
          params: {
            marketId: market.id,
            entryPoint: resolvedEntryPoint,
            title: market.title,
            image: market.image,
          },
        });
      }}
    >
      <LinearGradient
        colors={['#1a2942', '#3d2621']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={tw.style('w-full rounded-2xl')}
      >
        <Box twClassName="p-4">
          <Box twClassName="mb-4">
            <Text
              variant={TextVariant.HeadingMd}
              color={TextColor.TextDefault}
              twClassName="text-center font-medium"
            >
              Super Bowl LX (2026)
            </Text>
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="mb-6"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-1 gap-3"
            >
              <Box
                twClassName="w-12 h-12 rounded-xl"
                style={tw.style('bg-[#1D4E9B]')}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
              >
                <Text
                  variant={TextVariant.HeadingSm}
                  style={tw.style('text-[#B3F392] font-bold')}
                >
                  SEA
                </Text>
              </Box>
              <Text
                variant={TextVariant.DisplayMd}
                style={tw.style('text-white font-bold text-5xl')}
              >
                SEA
              </Text>
            </Box>

            <Box alignItems={BoxAlignItems.Center} twClassName="px-4">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextDefault}
                twClassName="font-medium"
              >
                Sun, Feb 8
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextDefault}
                twClassName="font-medium"
              >
                3:30 PM
              </Text>
            </Box>

            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-1 gap-3 justify-end"
            >
              <Text
                variant={TextVariant.DisplayMd}
                style={tw.style('text-white font-bold text-5xl')}
              >
                DEN
              </Text>
              <Box
                twClassName="w-12 h-12 rounded-xl"
                style={tw.style('bg-[#FC4C02]')}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
              >
                <Text
                  variant={TextVariant.HeadingSm}
                  style={tw.style('text-white font-bold')}
                >
                  DEN
                </Text>
              </Box>
            </Box>
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="w-full"
          >
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={
                <Text
                  variant={TextVariant.BodyLg}
                  style={tw.style('font-medium text-white')}
                >
                  SEA 77¢
                </Text>
              }
              onPress={() => {
                // TODO: Implement team selection handler
              }}
              style={tw.style('w-[48.5%] py-0 bg-[#1D4E9B]')}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={
                <Text
                  variant={TextVariant.BodyLg}
                  style={tw.style('font-medium text-white')}
                >
                  DEN 23¢
                </Text>
              }
              onPress={() => {
                // TODO: Implement team selection handler
              }}
              style={tw.style('w-[48.5%] py-0 bg-[#FC4C02]')}
            />
          </Box>
        </Box>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default PredictMarketSport;
