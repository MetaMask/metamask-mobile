import React, { useCallback } from 'react';
import { View, TouchableOpacity, Pressable, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../../component-library/hooks';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import type { PerpsMarketListHeaderProps } from './PerpsMarketListHeader.types';
import styleSheet from './PerpsMarketListHeader.styles';

/**
 * PerpsMarketListHeader Component
 *
 * Header component for Perps Market List view with back button,
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
 * <PerpsMarketListHeader
 *   title="Markets"
 *   isSearchVisible={isSearchVisible}
 *   onSearchToggle={handleSearchToggle}
 * />
 * ```
 *
 * @example Custom back handler
 * ```tsx
 * <PerpsMarketListHeader
 *   onBack={customBackHandler}
 *   isSearchVisible={false}
 *   onSearchToggle={toggleSearch}
 * />
 * ```
 */
const PerpsMarketListHeader: React.FC<PerpsMarketListHeaderProps> = ({
  title,
  isSearchVisible = false,
  onBack,
  onSearchToggle,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
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
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        testID={testID ? `${testID}-back-button` : undefined}
      >
        <Icon name={IconName.ArrowLeft} size={IconSize.Sm} />
      </TouchableOpacity>

      {/* Title */}
      <View style={styles.headerTitleContainer}>
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.headerTitle}
        >
          {title || strings('perps.title')}
        </Text>
      </View>

      {/* Search Toggle Button */}
      <View style={styles.titleButtonsRightContainer}>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={onSearchToggle}
          testID={testID ? `${testID}-search-toggle` : undefined}
        >
          <Icon
            name={isSearchVisible ? IconName.Close : IconName.Search}
            size={IconSize.Lg}
          />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

export default PerpsMarketListHeader;
