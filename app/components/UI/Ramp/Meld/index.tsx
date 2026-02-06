// Meld PoC — Main Entry Point
//
// Root component for the Meld direct integration PoC.
// Wraps the flow with MeldSDKProvider and sets up a stack navigator.
//
// OLD: User -> RampSDKProvider -> on-ramp SDK -> on-ramp API -> [N providers]
// NEW: User -> MeldSDKProvider -> Meld API -> [N providers]
//
// See README.md for full architecture comparison.

import React from 'react';
import { useSelector } from 'react-redux';
import { createStackNavigator } from '@react-navigation/stack';
import { MeldSDKProvider } from './MeldProvider';
import MeldBuildQuote from './Views/BuildQuote/MeldBuildQuote';
import MeldQuotes from './Views/Quotes/MeldQuotes';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';

const Stack = createStackNavigator();

interface MeldRampFlowProps {
  /** Optional initial wallet address. If not provided, uses the active account. */
  walletAddress?: string;
}

const MeldRampFlow: React.FC<MeldRampFlowProps> = ({ walletAddress }) => {
  // Get the active account address directly from the accounts controller
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const address = walletAddress || selectedAccount?.address || '';

  return (
    <MeldSDKProvider initialWalletAddress={address}>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerTitle: 'Buy Crypto (Meld PoC)',
        }}
      >
        <Stack.Screen
          name="MeldBuildQuote"
          component={MeldBuildQuote}
          options={{ headerTitle: 'Buy Crypto' }}
        />
        <Stack.Screen
          name="MeldQuotes"
          component={MeldQuotes}
          options={{ headerTitle: 'Select Provider' }}
        />
      </Stack.Navigator>
    </MeldSDKProvider>
  );
};

export default MeldRampFlow;
