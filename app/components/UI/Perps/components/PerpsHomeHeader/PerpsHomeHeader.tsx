import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../../component-library/hooks';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
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
import type { PerpsHomeHeaderProps } from './PerpsHomeHeader.types';
import styleSheet from './PerpsHomeHeader.styles';

/**
 * PerpsHomeHeader Component
 *
 * Header component for Perps Home view with back button,
 * title, and search toggle functionality
 *
 * Features:
 * - Back button using ButtonIcon component
 * - Centered title with custom text support
 * - Search toggle button that changes icon based on visibility
 *
 * @example
 * ```tsx
 * <PerpsHomeHeader
 *   isSearchVisible={isSearchVisible}
 *   onSearchToggle={handleSearchToggle}
 * />
 * ```
 *
 * @example Custom back handler
 * ```tsx
 * <PerpsHomeHeader
 *   title="My Markets"
 *   onBack={customBackHandler}
 *   isSearchVisible={false}
 *   onSearchToggle={toggleSearch}
 * />
 * ```
 */
const PerpsHomeHeader: React.FC<PerpsHomeHeaderProps> = ({
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
    <View style={styles.header} testID={testID}>
      {/* Back Button */}
      <ButtonIcon
        iconName={IconName.ArrowLeft}
        onPress={handleBack}
        size={ButtonIconSizes.Sm}
        iconColor={IconColor.Default}
        testID={testID ? `${testID}-back-button` : undefined}
      />

      {/* Title */}
      <Text
        variant={TextVariant.HeadingMD}
        color={TextColor.Default}
        style={styles.headerTitle}
      >
        {title || strings('perps.title')}
      </Text>

      {/* Search Toggle Button */}
      <TouchableOpacity
        style={styles.searchButton}
        onPress={onSearchToggle}
        testID={testID ? `${testID}-search-toggle` : undefined}
      >
        <Icon
          name={isSearchVisible ? IconName.Close : IconName.Search}
          size={IconSize.Lg}
          color={IconColor.Default}
        />
      </TouchableOpacity>
    </View>
  );
};

export default PerpsHomeHeader;
