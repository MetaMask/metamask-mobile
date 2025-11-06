import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import React from 'react';
import { Pressable } from 'react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
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

  return (
    <>
      {!isSearchVisible ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="w-full py-2"
        >
          <Text variant={TextVariant.HeadingLG}>Predictions</Text>
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
