import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Logger from '../../../../../util/Logger';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import { usePerpsNetworkConfig } from '../../hooks/usePerpsNetworkConfig';
import { selectPerpsNetwork } from '../../selectors/perpsController';
import PerpsProviderSelectorSheet from '../../components/PerpsProviderSelector/PerpsProviderSelectorSheet';
import type { ProviderNetworkOption } from '../../components/PerpsProviderSelector/PerpsProviderSelector.types';

/**
 * PerpsSelectProviderView
 *
 * Navigation-based wrapper for the provider selector bottom sheet.
 * Handles combined provider + network switching.
 */
const PerpsSelectProviderView: React.FC = () => {
  const navigation = useNavigation();
  const { activeProvider, switchProvider } = usePerpsProvider();
  const { toggleTestnet } = usePerpsNetworkConfig();
  const network = useSelector(selectPerpsNetwork);
  const isTestnet = network === 'testnet';

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const selectedOptionId = useMemo(
    () => `${activeProvider}-${isTestnet ? 'testnet' : 'mainnet'}`,
    [activeProvider, isTestnet],
  );

  const handleOptionSelect = useCallback(
    async (option: ProviderNetworkOption) => {
      const providerChanged = option.providerId !== activeProvider;
      const networkChanged = option.isTestnet !== isTestnet;

      if (!providerChanged && !networkChanged) {
        return;
      }

      // Switch provider first if needed
      if (providerChanged) {
        const result = await switchProvider(option.providerId);
        if (!result.success) {
          Logger.error(
            new Error(
              `Failed to switch perps provider to ${option.providerId}`,
            ),
            { message: result.error },
          );
          return;
        }
      }

      // Then toggle network if needed
      if (networkChanged) {
        const result = await toggleTestnet();
        if (!result.success) {
          Logger.error(new Error(`Failed to toggle perps testnet`), {
            message: result.error,
          });
          return;
        }
      }
    },
    [activeProvider, isTestnet, switchProvider, toggleTestnet],
  );

  return (
    <PerpsProviderSelectorSheet
      isVisible
      onClose={handleClose}
      selectedOptionId={selectedOptionId}
      onOptionSelect={handleOptionSelect}
      testID="perps-select-provider-sheet"
    />
  );
};

export default PerpsSelectProviderView;
