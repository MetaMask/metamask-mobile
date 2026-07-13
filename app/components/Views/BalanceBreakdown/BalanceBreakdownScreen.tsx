import React from 'react';
import { PerpsConnectionProvider } from '../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../UI/Perps/providers/PerpsStreamManager';
import BalanceBreakdownView from './BalanceBreakdownView';

/**
 * Stack entry for balance breakdown. MainNavigator screens sit outside Homepage’s
 * PerpsStreamProvider, but usePerpsLiveAccount / usePerpsLivePositions require it.
 * Mirrors Homepage’s Perps section (PerpsConnectionProvider + PerpsStreamProvider).
 */
const BalanceBreakdownScreen: React.FC = () => (
  <PerpsConnectionProvider suppressErrorView>
    <PerpsStreamProvider>
      <BalanceBreakdownView />
    </PerpsStreamProvider>
  </PerpsConnectionProvider>
);

export default BalanceBreakdownScreen;
