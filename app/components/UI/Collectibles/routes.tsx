import CollectiblesExplore from './views/CollectiblesExplore';
import CollectiblesSearch from './views/CollectiblesSearch/CollectiblesSearch';
import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from '../../../constants/navigation/Routes';
import { fullScreenModalSlideFromBottomNativeOptions } from '../../../constants/navigation/clearStackNavigatorOptions';
import type {
  CollectiblesEntryDestination,
  CollectiblesStackParamList,
} from './types/navigation';
import CollectiblesHome from './views/CollectiblesHome';
import CollectiblesPack from './views/CollectiblesPack';
import CollectiblesReveal from './views/CollectiblesReveal';
import CollectiblesCard from './views/CollectiblesCard';
import CollectiblesOnboardingScreen from './views/CollectiblesOnboarding/CollectiblesOnboardingScreen';
import { selectCollectiblesHasCompletedOnboarding } from './selectors/onboarding';

import Engine from '../../../core/Engine';
import { CollectiblesOnboardingContext } from './CollectiblesOnboardingContext';
import { CollectionTransferProvider } from './components/CollectionTransfer/CollectionTransferProvider';

const Stack = createNativeStackNavigator<CollectiblesStackParamList>();

const REVEAL_OPTIONS = {
  ...fullScreenModalSlideFromBottomNativeOptions,
  // Only explicit buttons can leave the reveal, including a replay.
  gestureEnabled: false,
  fullScreenGestureEnabled: false,
};

/** Onboarding is replaced by the requested destination, without inserting a hub in history. */
const CollectiblesScreenStack = () => {
  const hasCompletedOnboarding = useSelector(
    selectCollectiblesHasCompletedOnboarding,
  );
  const [destination, setDestination] =
    useState<CollectiblesEntryDestination>();
  const complete = useCallback((entry?: CollectiblesEntryDestination) => {
    setDestination(entry);
    Engine.context.CollectiblesController.completeOnboarding();
  }, []);
  return (
    <CollectiblesOnboardingContext.Provider value={complete}>
      <CollectionTransferProvider>
        <Stack.Navigator
          key={hasCompletedOnboarding ? 'ready' : 'onboarding'}
          initialRouteName={
            hasCompletedOnboarding
              ? destination?.kind === 'card'
                ? Routes.COLLECTIBLES.CARD
                : destination?.kind === 'pack'
                  ? Routes.COLLECTIBLES.PACK
                  : Routes.COLLECTIBLES.HOME
              : Routes.COLLECTIBLES.ONBOARDING
          }
          screenOptions={{ headerShown: false }}
        >
          {hasCompletedOnboarding ? (
            <>
              <Stack.Screen
                name={Routes.COLLECTIBLES.SEARCH}
                component={CollectiblesSearch}
              />
              <Stack.Screen
                name={Routes.COLLECTIBLES.HOME}
                component={CollectiblesHome}
                initialParams={
                  destination?.kind === 'home'
                    ? { initialTab: destination.tab }
                    : destination?.kind === 'purchase'
                      ? { entry: destination }
                      : undefined
                }
              />
              <Stack.Screen
                name={Routes.COLLECTIBLES.PACK}
                component={CollectiblesPack}
                initialParams={
                  destination?.kind === 'pack'
                    ? { packCode: destination.packCode }
                    : undefined
                }
                options={({ route }) =>
                  route.params.heroSource
                    ? { animation: 'none', gestureEnabled: false }
                    : {}
                }
              />
              <Stack.Screen
                name={Routes.COLLECTIBLES.REVEAL}
                component={CollectiblesReveal}
                options={REVEAL_OPTIONS}
              />
              <Stack.Screen
                name={Routes.COLLECTIBLES.EXPLORE}
                component={CollectiblesExplore}
              />
              <Stack.Screen
                name={Routes.COLLECTIBLES.CARD}
                component={CollectiblesCard}
                initialParams={
                  destination?.kind === 'card'
                    ? { mint: destination.mint }
                    : undefined
                }
              />
            </>
          ) : (
            <Stack.Screen
              name={Routes.COLLECTIBLES.ONBOARDING}
              component={CollectiblesOnboardingScreen}
            />
          )}
        </Stack.Navigator>
      </CollectionTransferProvider>
    </CollectiblesOnboardingContext.Provider>
  );
};

export default CollectiblesScreenStack;
