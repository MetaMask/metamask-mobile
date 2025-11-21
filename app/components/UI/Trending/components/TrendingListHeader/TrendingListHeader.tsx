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
import { useStyles } from '../../../../../component-library/hooks';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import type { TrendingListHeaderProps } from './TrendingListHeader.types';
import styleSheet from './TrendingListHeader.styles';

/**
 * TrendingListHeader Component
 *
 * Header component for Trending Tokens List view with back button,
 * title, and search toggle functionality
 *
 * Features:
 * - Back button with default or custom navigation handler
 * - Centered title with custom text support
 * - Search toggle button that changes icon based on visibility
 * - Keyboard dismiss on header press
 *
 * @example
 * ```tsx
 * <TrendingListHeader
 *   title="Trending Tokens"
 *   isSearchVisible={isSearchVisible}
 *   onSearchToggle={handleSearchToggle}
 * />
 * ```
 *
 * @example Custom back handler
 * ```tsx
 * <TrendingListHeader
 *   onBack={customBackHandler}
 *   isSearchVisible={false}
 *   onSearchToggle={toggleSearch}
 * />
 * ```
 */
const TrendingListHeader: React.FC<TrendingListHeaderProps> = ({
  title,
  isSearchVisible = false,
  searchQuery = '',
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

  return (
    <Pressable
      style={styles.header}
      onPress={() => Keyboard.dismiss()}
      testID={testID}
    >
      {isSearchVisible ? (
        <View style={styles.headerContainerWrapper}>
          {/* Search Bar - Replaces back button and title */}
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
              placeholder={strings('trending.search_placeholder')}
              placeholderTextColor={colors.text.muted}
              autoFocus
              style={tw.style('flex-1 text-base text-default')}
              testID={testID ? `${testID}-search-bar` : undefined}
            />
          </Box>
          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.searchButton}
            onPress={onSearchToggle}
            testID={testID ? `${testID}-search-close` : undefined}
          >
            <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
              {strings('trending.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.headerContainerWrapper}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            testID={testID ? `${testID}-back-button` : undefined}
          >
            <Icon name={IconName.ArrowLeft} size={IconSize.Md} />
          </TouchableOpacity>

          {/* Title */}
          <View style={styles.headerTitleContainer}>
            <Text
              variant={TextVariant.HeadingLG}
              color={TextColor.Default}
              style={styles.headerTitle}
            >
              {title || strings('trending.trending_tokens')}
            </Text>
          </View>

          {/* Search Toggle Button */}
          <View style={styles.titleButtonsRightContainer}>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={onSearchToggle}
              testID={testID ? `${testID}-search-toggle` : undefined}
            >
              <Icon name={IconName.Search} size={IconSize.Lg} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Pressable>
  );
};

export default TrendingListHeader;
