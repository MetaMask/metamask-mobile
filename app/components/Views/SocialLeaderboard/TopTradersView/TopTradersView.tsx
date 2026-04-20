import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { TopTradersViewSelectorsIDs } from './TopTradersView.testIds';

/**
 * TopTradersView — Social leaderboard detail screen.
 *
 * Displays top-performing traders across the platform.
 * Currently an empty scaffold; content will be added once the data layer is ready.
 */
const TopTradersView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSearchPress = useCallback(() => {
    // Search UI will be wired when the leaderboard data layer ships.
  }, []);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={TopTradersViewSelectorsIDs.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-2 py-2"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBack}
          testID={TopTradersViewSelectorsIDs.BACK_BUTTON}
        />
        <ButtonIcon
          iconName={IconName.Search}
          size={ButtonIconSize.Md}
          onPress={handleSearchPress}
          testID={TopTradersViewSelectorsIDs.SEARCH_BUTTON}
        />
      </Box>

      <Box twClassName="px-4 pt-2 pb-3">
        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Medium}
        >
          {strings('social_leaderboard.top_traders_view.title')}
        </Text>
      </Box>
    </SafeAreaView>
  );
};

export default TopTradersView;
