import React, { useRef } from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
  Theme,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../../util/theme';
import { onNavigationReady } from '../../actions/navigation';
import { useDispatch, useSelector } from 'react-redux';
import NavigationService from '../../core/NavigationService';
import { trace, endTrace, TraceOperation, TraceName } from '../../util/trace';
import getUIStartupSpan from '../../core/Performance/UIStartup';
import EngineService from '../../core/EngineService';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import { selectServicesReady } from '../../reducers/user/selectors';
/**
 * Props for the NavigationProvider component
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type NavigationProviderProps = {
  children: React.ReactNode;
};

const Stack = createStackNavigator();

/**
 * Provides the navigation context to the app
 */
const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
}) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const hasInitialized = useRef(false);
  const servicesReady = useSelector(selectServicesReady);

  // Start trace when navigation provider is initialized
  if (!hasInitialized.current) {
    trace({
      name: TraceName.NavInit,
      parentContext: getUIStartupSpan(),
      op: TraceOperation.NavInit,
    });
    hasInitialized.current = true;
  }

  /**
   * Triggers when the navigation is ready
   */
  const onReady = () => {
    // End trace when navigation is ready
    endTrace({ name: TraceName.NavInit });
    // Dispatch navigation ready action, used by sagas
    dispatch(onNavigationReady());
    EngineService.start();
    AppStateEventProcessor.start();
  };

  /**
   * Sets the navigation ref on the NavigationService
   */
  const setNavigationRef = (ref: NavigationContainerRef) => {
    // This condition only happens on unmount. But that should never happen since this is meant to always be mounted.
    if (!ref) {
      return;
    }
    NavigationService.navigation = ref;
  };

  return (
    <NavigationContainer
      // TODO: Check if other color properties are needed
      theme={{ colors: { background: colors.background.default } } as Theme}
      onReady={onReady}
      ref={setNavigationRef}
    >
      <Stack.Navigator
        initialRouteName="NavigationProvider"
        screenOptions={{ headerShown: false }}
      >
        {/* <Stack.Screen name={Routes.FOX_LOADER} component={FoxLoader} /> */}
        <Stack.Screen name="NavigationChildren">
          {() => <>{servicesReady ? children : null}</>}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default NavigationProvider;
