import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import Routes from '../../../../../constants/navigation/Routes';
import SearchBox from '../SearchBox';

interface PredictFeedHeaderProps {
  isSearchVisible: boolean;
  onSearchToggle: () => void;
  onSearchCancel: () => void;
  onSearch: (query: string) => void;
}

const PredictFeedHeader: React.FC<PredictFeedHeaderProps> = ({
  isSearchVisible,
  onSearchToggle,
  onSearchCancel,
  onSearch,
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });
    }
  };

  return (
    <>
      {!isSearchVisible ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="w-full pt-2 pb-4 px-4"
          style={{ backgroundColor: colors.background.default }}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-3"
          >
            <Pressable testID="back-button" onPress={handleBackPress}>
              <Icon
                name={IconName.ArrowLeft}
                size={IconSize.Lg}
                color={colors.text.default}
              />
            </Pressable>
            <Text variant={TextVariant.HeadingLg}>Predictions</Text>
          </Box>
          <Pressable testID="search-toggle-button" onPress={onSearchToggle}>
            <Icon
              name={IconName.Search}
              size={IconSize.Lg}
              color={colors.text.default}
            />
          </Pressable>
        </Box>
      ) : (
        <SearchBox
          isVisible={isSearchVisible}
          onCancel={onSearchCancel}
          onSearch={onSearch}
        />
      )}
    </>
  );
};

export default PredictFeedHeader;
