import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
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
import { selectPerpsNetwork } from '../../selectors/perpsController';
import type { PerpsProviderSelectorBadgeProps } from './PerpsProviderSelector.types';
import { PROVIDER_DISPLAY_INFO } from './PerpsProviderSelector.constants';
import { styleSheet } from './PerpsProviderSelector.styles';

/**
 * PerpsProviderSelectorBadge Component
 *
 * A compact badge that shows the current provider + network and opens selection sheet.
 * Only visible when multiple providers are available.
 * Shows a warning dot when on testnet.
 */
const PerpsProviderSelectorBadge: React.FC<PerpsProviderSelectorBadgeProps> = ({
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { activeProvider, isMultiProviderEnabled } = usePerpsProvider();
  const network = useSelector(selectPerpsNetwork);
  const isTestnet = network === 'testnet';

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
  const currentProvider = activeProvider
    ? PROVIDER_DISPLAY_INFO[activeProvider]
    : PROVIDER_DISPLAY_INFO.hyperliquid;

  return (
    <TouchableOpacity
      style={styles.badgeContainer}
      onPress={handlePress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Current provider: ${currentProvider.name}, ${isTestnet ? 'Testnet' : 'Mainnet'}. Tap to change.`}
    >
      {isTestnet && <View style={styles.testnetDot} />}
      <Text
        variant={TextVariant.BodySM}
        color={isTestnet ? TextColor.Warning : TextColor.Alternative}
        style={styles.badgeText}
      >
        {currentProvider.name}
      </Text>
      <Icon
        name={IconName.ArrowDown}
        size={IconSize.Xs}
        color={isTestnet ? IconColor.Warning : IconColor.Alternative}
      />
    </TouchableOpacity>
  );
};

export default PerpsProviderSelectorBadge;
