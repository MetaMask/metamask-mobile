import React from 'react';
import { Image, ImageBackground, Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
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
import { selectSeasonName } from '../../../../../reducers/rewards/selectors';
import Routes from '../../../../../constants/navigation/Routes';
import introBg from '../../../../../images/rewards/rewards-onboarding-intro-bg.png';
import intro from '../../../../../images/rewards/rewards-onboarding-intro.png';
import { strings } from '../../../../../../locales/i18n';

const PreviousSeasonTile: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const seasonName = useSelector(selectSeasonName);

  if (!seasonName) {
    return null;
  }

  return (
    <Pressable
      onPress={() => navigation.navigate(Routes.PREVIOUS_SEASON_VIEW)}
      style={({ pressed }) =>
        tw.style(
          'rounded-xl overflow-hidden h-50 bg-muted',
          pressed && 'opacity-70',
        )
      }
      testID="previous-season-tile"
    >
      <ImageBackground
        source={introBg}
        resizeMode="cover"
        style={tw.style('flex-1')}
        testID="previous-season-tile-background"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.End}
          justifyContent={BoxJustifyContent.Between}
          twClassName="flex-1"
        >
          <Box
            twClassName="pl-4 py-4 flex-1"
            flexDirection={BoxFlexDirection.Column}
            justifyContent={BoxJustifyContent.End}
            alignItems={BoxAlignItems.Start}
          >
            <Text variant={TextVariant.BodySm}>
              {strings('rewards.campaign.pill_complete')}
            </Text>
            <Text
              variant={TextVariant.HeadingLg}
              color={TextColor.OverlayInverse}
              twClassName="font-bold"
              testID="previous-season-tile-name"
            >
              {seasonName}
            </Text>
          </Box>
          <Image
            source={intro}
            resizeMode="cover"
            style={tw.style('w-60 h-full')}
            testID="previous-season-tile-image"
          />
        </Box>
      </ImageBackground>
    </Pressable>
  );
};

export default PreviousSeasonTile;
