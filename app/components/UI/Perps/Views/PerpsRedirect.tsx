import React, { useEffect } from 'react';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import { PERFORMANCE_CONFIG } from '../constants/perpsConfig';
import PerpsLoader from '../components/PerpsLoader';
import { usePerpsConnection } from '../hooks/usePerpsConnection';

const PerpsRedirect: React.FC = () => {
  const { isConnected, isConnecting, isInitialized } = usePerpsConnection();

  useEffect(() => {
    // Only redirect when successfully connected
    if (isConnected && isInitialized) {
      // Navigate to wallet home with perps tab selection
      // Using the same pattern as PerpsTutorialCarousel
      NavigationService.navigation.navigate(Routes.WALLET.HOME);

      // The timeout is REQUIRED - React Navigation needs time to:
      // 1. Complete the navigation transition
      // 2. Mount the Wallet component
      // 3. Make navigation context available for setParams
      // Without this delay, the tab selection will fail
      setTimeout(() => {
        NavigationService.navigation.setParams({
          initialTab: 'perps',
          shouldSelectPerpsTab: true,
        });
      }, PERFORMANCE_CONFIG.NavigationParamsDelayMs);
    }
  }, [isConnected, isInitialized]);

  // Show loader while initializing or connecting
  if (!isInitialized || isConnecting) {
    return (
      <PerpsLoader
        message={
          !isInitialized
            ? 'Initializing Perps controller...'
            : 'Connecting to Perps trading...'
        }
        fullScreen
      />
    );
  }

  // Show loading while waiting for successful connection before redirect
  return <PerpsLoader message="Redirecting to Perps trading..." fullScreen />;
};

export default PerpsRedirect;
