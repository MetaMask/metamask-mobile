import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Logger from '../../../../../util/Logger';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import PerpsProviderSelectorSheet from '../../components/PerpsProviderSelector/PerpsProviderSelectorSheet';
import type { PerpsProviderType } from '@metamask/perps-controller';

/**
 * PerpsSelectProviderView
 *
 * Navigation-based wrapper for the provider selector bottom sheet.
 * This ensures the sheet renders at full-screen level rather than
 * being constrained by parent container bounds.
 */
const PerpsSelectProviderView: React.FC = () => {
  const navigation = useNavigation();
  const { activeProvider, switchProvider } = usePerpsProvider();

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleProviderSelect = useCallback(
    async (providerId: PerpsProviderType) => {
      const result = await switchProvider(providerId);
      if (!result.success) {
        Logger.error(
          new Error(`Failed to switch perps provider to ${providerId}`),
          { message: result.error },
        );
      }
      // Navigation is handled by handleClose when bottom sheet closes
    },
    [switchProvider],
  );

  // Determine selected provider, defaulting to hyperliquid for aggregated mode
  const selectedProvider =
    activeProvider !== 'aggregated' ? activeProvider : 'hyperliquid';

  return (
    <PerpsProviderSelectorSheet
      isVisible
      onClose={handleClose}
      selectedProvider={selectedProvider}
      onProviderSelect={handleProviderSelect}
      testID="perps-select-provider-sheet"
    />
  );
};

export default PerpsSelectProviderView;
