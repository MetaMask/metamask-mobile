import React, { useState, useEffect } from 'react';
import { Pressable, TextInput, Animated } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import styleSheet from './SearchBox.styles';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';

interface SearchBoxProps {
  isVisible: boolean;
  onCancel: () => void;
  onSearch: (query: string) => void;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  isVisible,
  onCancel,
  onSearch,
}) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { colors: theme.colors });
  const tw = useTailwind();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    if (isVisible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, fadeAnim, slideAnim]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    onSearch(text);
  };

  const handleCancel = () => {
    setSearchQuery('');
    onCancel();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="w-full py-2 gap-3"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1 bg-muted rounded-lg px-3 py-2"
        >
          <Icon
            name={IconName.Search}
            size={IconSize.Sm}
            color={colors.text.muted}
            style={tw.style('mr-2')}
          />
          <TextInput
            placeholder={strings('predict.search_placeholder')}
            placeholderTextColor={colors.text.muted}
            value={searchQuery}
            onChangeText={handleSearch}
            style={styles.input}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Icon
                name={IconName.CircleX}
                size={IconSize.Md}
                color={colors.text.muted}
              />
            </Pressable>
          )}
        </Box>
        <Pressable onPress={handleCancel}>
          <Text
            variant={TextVariant.BodyMD}
            color={colors.text.default}
            style={tw.style('font-medium')}
          >
            {strings('predict.search_cancel')}
          </Text>
        </Pressable>
      </Box>
    </Animated.View>
  );
};

export default SearchBox;
