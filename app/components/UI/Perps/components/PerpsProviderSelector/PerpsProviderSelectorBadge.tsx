import React, { useCallback } from 'react';
import {
  Box,
  SelectButton,
  SelectButtonSize,
  SelectButtonVariant,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import { selectPerpsNetwork } from '../../selectors/perpsController';
import type { PerpsProviderSelectorBadgeProps } from './PerpsProviderSelector.types';
import { PROVIDER_DISPLAY_INFO } from './PerpsProviderSelector.constants';

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
    <SelectButton
      size={SelectButtonSize.Sm}
      variant={SelectButtonVariant.Primary}
      value={currentProvider.name}
      onPress={handlePress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Current provider: ${currentProvider.name}, ${isTestnet ? 'Testnet' : 'Mainnet'}. Tap to change.`}
      twClassName="self-center"
      startAccessory={
        isTestnet ? (
          <Box twClassName="w-1.5 h-1.5 rounded-full bg-warning-default" />
        ) : undefined
      }
    />
  );
};

export default PerpsProviderSelectorBadge;
