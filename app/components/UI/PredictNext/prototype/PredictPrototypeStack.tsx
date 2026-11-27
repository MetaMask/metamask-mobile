import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PrototypeStateProvider } from './PrototypeState';
import { PrototypeSheetHost } from './sheets';
import { ProtoRoutes, type ProtoStackParamList } from './navigation';
import { FeedScreen } from './screens/FeedScreen';
import { GameEventScreen } from './screens/GameEventScreen';
import { StandardEventScreen } from './screens/StandardEventScreen';
import { CryptoEventScreen } from './screens/CryptoEventScreen';
import { PositionsScreen } from './screens/PositionsScreen';
import { CategoryScreen } from './screens/CategoryScreen';

/** Dev-only switch: routes Predict to the fixture-driven Kalshi prototype.
 * Off under Jest so existing Predict tests keep exercising the real stacks. */
export const PREDICT_PROTOTYPE_ENABLED =
  __DEV__ && process.env.JEST_WORKER_ID === undefined;

const Stack = createNativeStackNavigator<ProtoStackParamList>();

const PredictPrototypeStack = () => (
  <PrototypeStateProvider>
    <Stack.Navigator
      initialRouteName={ProtoRoutes.FEED}
      screenOptions={{ headerShown: false, animation: 'default' }}
    >
      <Stack.Screen name={ProtoRoutes.FEED} component={FeedScreen} />
      <Stack.Screen name={ProtoRoutes.GAME} component={GameEventScreen} />
      <Stack.Screen
        name={ProtoRoutes.STANDARD}
        component={StandardEventScreen}
      />
      <Stack.Screen name={ProtoRoutes.CRYPTO} component={CryptoEventScreen} />
      <Stack.Screen name={ProtoRoutes.POSITIONS} component={PositionsScreen} />
      <Stack.Screen name={ProtoRoutes.CATEGORY} component={CategoryScreen} />
    </Stack.Navigator>
    <PrototypeSheetHost />
  </PrototypeStateProvider>
);

export default PredictPrototypeStack;
