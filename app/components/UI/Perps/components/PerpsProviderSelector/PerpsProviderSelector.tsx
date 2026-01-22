import React, { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import { usePerpsLivePositions } from '../../hooks/stream';
import PerpsProviderSelectorBadge from './PerpsProviderSelectorBadge';
import PerpsProviderSwitchWarning from './PerpsProviderSwitchWarning';
import type { PerpsProviderSelectorProps } from './PerpsProviderSelector.types';
import type { PerpsProviderType } from '../../controllers/types';
import Routes from '../../../../../constants/navigation/Routes';

/**
 * PerpsProviderSelector - Complete provider selection component
 *
 * Combines the badge (header trigger), selection sheet, and warning modal
 * into a single component that manages the provider switching flow.
 *
 * Features:
 * - Shows current provider badge in header
 * - Opens bottom sheet with available providers
 * - Warns user when switching with open positions
 * - Handles provider switch with proper disconnection/reconnection
 *
 * @example
 * ```tsx
 * <PerpsProviderSelector testID="provider-selector" />
 * ```
 */
const PerpsProviderSelector: React.FC<PerpsProviderSelectorProps> = ({
  testID,
}) => {
  const navigation = useNavigation();
  const {
    activeProvider,
    availableProviders,
    currentProviderInfo,
    hasMultipleProviders,
    setActiveProvider,
  } = usePerpsProvider();

  const { positions } = usePerpsLivePositions({ throttleMs: 5000 });

  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [pendingProviderId, setPendingProviderId] =
    useState<PerpsProviderType | null>(null);

  const handleSelectProvider = useCallback(
    (providerId: PerpsProviderType) => {
      if (providerId === activeProvider) {
        return;
      }

      if (positions.length > 0) {
        setPendingProviderId(providerId);
        setIsWarningVisible(true);
        return;
      }

      setActiveProvider(providerId);
    },
    [activeProvider, positions.length, setActiveProvider],
  );

  const handleBadgePress = useCallback(() => {
    navigation.navigate(
      Routes.PERPS.MODALS.ROOT as never,
      {
        screen: Routes.PERPS.SELECT_PROVIDER,
        params: {
          providers: availableProviders,
          activeProvider,
          onSelectProvider: handleSelectProvider,
        },
      } as never,
    );
  }, [navigation, availableProviders, activeProvider, handleSelectProvider]);

  const handleWarningClose = useCallback(() => {
    setIsWarningVisible(false);
    setPendingProviderId(null);
  }, []);

  const handleWarningConfirm = useCallback(async () => {
    if (pendingProviderId) {
      setIsWarningVisible(false);
      await setActiveProvider(pendingProviderId);
      setPendingProviderId(null);
    }
  }, [pendingProviderId, setActiveProvider]);

  // Don't render if no provider info or only one provider available
  if (!currentProviderInfo || !hasMultipleProviders) {
    return null;
  }

  const pendingProviderInfo = pendingProviderId
    ? availableProviders.find((p) => p.id === pendingProviderId)
    : null;

  return (
    <>
      <PerpsProviderSelectorBadge
        currentProvider={currentProviderInfo}
        onPress={handleBadgePress}
        testID={testID ? `${testID}-badge` : undefined}
      />

      <PerpsProviderSwitchWarning
        isVisible={isWarningVisible}
        onClose={handleWarningClose}
        onConfirm={handleWarningConfirm}
        fromProvider={currentProviderInfo.name}
        toProvider={pendingProviderInfo?.name || ''}
        openPositionsCount={positions.length}
        testID={testID ? `${testID}-warning` : undefined}
      />
    </>
  );
};

export default PerpsProviderSelector;
