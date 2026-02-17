import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import type { PerpsProviderSelectorBadgeProps } from './PerpsProviderSelector.types';
import { PROVIDER_DISPLAY_INFO } from './PerpsProviderSelector.constants';
import { styleSheet } from './PerpsProviderSelector.styles';

/**
 * PerpsProviderSelectorBadge Component
 *
 * A compact badge that shows the current provider and opens selection sheet.
 * Only visible when multiple providers are available.
 *
 * @example
 * ```tsx
 * <PerpsProviderSelectorBadge testID="provider-badge" />
 * ```
 */
const PerpsProviderSelectorBadge: React.FC<PerpsProviderSelectorBadgeProps> = ({
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { activeProvider, isMultiProviderEnabled } = usePerpsProvider();

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.SELECT_PROVIDER,
    });
  }, [navigation]);

  // Don't render if only one provider available
  if (!isMultiProviderEnabled) {
    return null;
  }

  // Get display info for current provider
  const currentProvider =
    activeProvider && activeProvider !== 'aggregated'
      ? PROVIDER_DISPLAY_INFO[activeProvider]
      : PROVIDER_DISPLAY_INFO.hyperliquid;

  return (
    <TouchableOpacity
      style={styles.badgeContainer}
      onPress={handlePress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Current provider: ${currentProvider.name}. Tap to change.`}
    >
      <Text
        variant={TextVariant.BodySM}
        color={TextColor.Alternative}
        style={styles.badgeText}
      >
        {currentProvider.name}
      </Text>
      <Icon
        name={IconName.ArrowDown}
        size={IconSize.Xs}
        color={IconColor.Alternative}
      />
    </TouchableOpacity>
  );
};

export default PerpsProviderSelectorBadge;
