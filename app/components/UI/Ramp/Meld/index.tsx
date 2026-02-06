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
import MeldCheckout from './Views/Checkout/MeldCheckout';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import Routes from '../../../../constants/navigation/Routes';

const Stack = createStackNavigator();

const MeldRampFlow: React.FC = () => {
  // Get the active account address directly from the accounts controller
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const address = selectedAccount?.address || '';

  return (
    <MeldSDKProvider initialWalletAddress={address}>
      <Stack.Navigator
        initialRouteName={Routes.MELD_RAMP.BUILD_QUOTE}
        screenOptions={{
          headerShown: true,
        }}
      >
        <Stack.Screen
          name={Routes.MELD_RAMP.BUILD_QUOTE}
          component={MeldBuildQuote}
          options={{ headerTitle: 'Buy Crypto (Meld PoC)' }}
        />
        <Stack.Screen
          name={Routes.MELD_RAMP.QUOTES}
          component={MeldQuotes}
          options={{ headerTitle: 'Select Provider' }}
        />
        <Stack.Screen
          name={Routes.MELD_RAMP.CHECKOUT}
          component={MeldCheckout}
          options={{
            headerTitle: 'Complete Purchase',
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </MeldSDKProvider>
  );
};

export default MeldRampFlow;
