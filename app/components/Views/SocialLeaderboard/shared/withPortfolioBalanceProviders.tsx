import React from 'react';
import { PerpsConnectionProvider } from '../../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../../UI/Perps/providers/PerpsStreamManager';

/**
 * Gives a social account list the perps stream the homepage balance reads.
 *
 * Connection stays with the wallet-root provider. This wrapper only supplies
 * the contexts those balance hooks require, and it does not open a second
 * socket.
 */
export const withPortfolioBalanceProviders = <P extends object>(
  Screen: React.ComponentType<P>,
): React.FC<P> => {
  const ScreenWithBalances: React.FC<P> = (props) => (
    <PerpsConnectionProvider isEnabled={false} suppressErrorView>
      <PerpsStreamProvider>
        <Screen {...props} />
      </PerpsStreamProvider>
    </PerpsConnectionProvider>
  );
  ScreenWithBalances.displayName = `withPortfolioBalanceProviders(${
    Screen.displayName || Screen.name || 'Screen'
  })`;
  return ScreenWithBalances;
};
