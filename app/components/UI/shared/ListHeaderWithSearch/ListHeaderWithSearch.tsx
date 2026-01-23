import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Pressable,
  Keyboard,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../component-library/hooks';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  IconName as DSIconName,
  TextVariant as DSTextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import HeaderCenter from '../../../../component-library/components-temp/HeaderCenter';
import { useTheme } from '../../../../util/theme';
import type { ListHeaderWithSearchProps } from './ListHeaderWithSearch.types';
import styleSheet from './ListHeaderWithSearch.styles';

/**
 * ListHeaderWithSearch Component
 *
 * Reusable header component for list views with back button,
 * title, and search toggle functionality
 *
 * Features:
 * - Back button with default or custom navigation handler
 * - Centered title with custom text support
 * - Search toggle button that changes icon based on visibility
 * - Keyboard dismiss on header press
 * - Configurable search placeholder and cancel text
 *
 * @example
 * ```tsx
 * <ListHeaderWithSearch
 *   title="My List"
 *   defaultTitle="Default Title"
 *   searchPlaceholder="Search..."
 *   cancelText="Cancel"
 *   isSearchVisible={isSearchVisible}
 *   onSearchToggle={handleSearchToggle}
 * />
 * ```
 *
 * @example Custom back handler
 * ```tsx
 * <ListHeaderWithSearch
 *   defaultTitle="Default Title"
 *   searchPlaceholder="Search..."
 *   cancelText="Cancel"
 *   onBack={customBackHandler}
 *   isSearchVisible={false}
 *   onSearchToggle={toggleSearch}
 * />
 * ```
 */
const ListHeaderWithSearch: React.FC<ListHeaderWithSearchProps> = ({
  title,
  defaultTitle,
  isSearchVisible = false,
  searchQuery = '',
  searchPlaceholder,
  cancelText,
  onSearchQueryChange,
  onSearchClear: _onSearchClear, // Not used - clear icon removed
  onBack,
  onSearchToggle,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation = useNavigation();

  // Default back handler
  const defaultHandleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // Use custom handler if provided, otherwise use default
  const handleBack = onBack || defaultHandleBack;

  if (isSearchVisible) {
    return (
      <Pressable
        style={styles.header}
        onPress={() => Keyboard.dismiss()}
        testID={testID}
      >
        <View style={styles.headerContainerWrapper}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            style={styles.searchBarContainer}
            twClassName={`flex-1 bg-muted rounded-lg ${Platform.OS === 'ios' ? 'py-3' : 'py-1'} px-3 mr-2`}
          >
            <Icon
              name={IconName.Search}
              size={IconSize.Sm}
              color={IconColor.Alternative}
              style={tw.style('mr-2')}
            />
            <TextInput
              value={searchQuery}
              onChangeText={onSearchQueryChange}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.text.muted}
              autoFocus
              style={tw.style('flex-1 text-base text-default')}
              testID={testID ? `${testID}-search-bar` : undefined}
            />
          </Box>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={onSearchToggle}
            testID={testID ? `${testID}-search-close` : undefined}
          >
            <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
              {cancelText}
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  }

  return (
    <HeaderCenter
      title={title || defaultTitle}
      onBack={handleBack}
      endButtonIconProps={[
        {
          iconName: DSIconName.Search,
          onPress: onSearchToggle,
          testID: testID ? `${testID}-search-toggle` : undefined,
        },
      ]}
      testID={testID}
    />
  );
};

export default ListHeaderWithSearch;
