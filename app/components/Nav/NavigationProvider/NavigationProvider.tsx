import React, { useRef, useEffect, useMemo } from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
  ParamListBase,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { useTheme, useAppTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';
import { onNavigationReady } from '../../../actions/navigation';
import { useDispatch } from 'react-redux';
import NavigationService from '../../../core/NavigationService';
import {
  trace,
  endTrace,
  TraceOperation,
  TraceName,
} from '../../../util/trace';
import getUIStartupSpan from '../../../core/Performance/UIStartup';
import { NavigationProviderProps } from './types';
import type { RootParamList } from '../../../types/navigation.d';

/**
 * Provides the navigation context to the app
 */
const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
}) => {
  const { colors } = useTheme();
  const appTheme = useAppTheme();
  const dispatch = useDispatch();
  const hasInitialized = useRef(false);
  const hasDispatchedReady = useRef(false);

  // Build complete navigation theme based on app theme
  // React Navigation v7 requires fonts in the theme
  const navigationTheme = useMemo(() => {
    const baseTheme =
      appTheme.themeAppearance === AppThemeKey.dark ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: colors.background.default,
      },
    };
  }, [appTheme.themeAppearance, colors.background.default]);

  // Start trace when navigation provider is initialized
  if (!hasInitialized.current) {
    trace({
      name: TraceName.NavInit,
      parentContext: getUIStartupSpan(),
      op: TraceOperation.NavInit,
    });
    hasInitialized.current = true;
  }

  // Dispatch navigation ready immediately on mount since the NavigationContainer
  // is ready for navigation even before navigators mount. This unblocks ControllersGate
  // which then allows App and its navigators to render.
  useEffect(() => {
    if (!hasDispatchedReady.current) {
      hasDispatchedReady.current = true;
      dispatch(onNavigationReady());
    }
  }, [dispatch]);

  /**
   * Triggers when the navigation is ready (after navigators mount)
   */
  const onReady = () => {
    // End trace when navigation is ready
    endTrace({ name: TraceName.NavInit });
  };

  /**
   * Sets the navigation ref on the NavigationService
   */
  const setNavigationRef = (ref: NavigationContainerRef<RootParamList>) => {
    // This condition only happens on unmount. But that should never happen since this is meant to always be mounted.
    if (!ref) {
      return;
    }
    NavigationService.navigation = ref;
  };

  /**
   * Debug logging for navigation state changes during React Navigation v7 migration.
   * This helps detect duplicate screens and navigation issues.
   * TODO: Remove after migration testing is complete.
   */
  const onStateChange = __DEV__
    ? (
        state:
          | ReturnType<NavigationContainerRef<ParamListBase>['getRootState']>
          | undefined,
      ) => {
        if (!state) return;

        const routes = state.routes || [];
        const routeNames = routes.map((r) => r.name);
        // eslint-disable-next-line no-console
        console.log('📍 Nav Stack:', routeNames.join(' → '));

        // Detect duplicate screens (likely broken navigation due to v7 navigate behavior change)
        const duplicates = routeNames.filter(
          (name, i) => routeNames.indexOf(name) !== i,
        );
        if (duplicates.length > 0) {
          // eslint-disable-next-line no-console
          console.warn('⚠️ DUPLICATE SCREENS DETECTED:', duplicates);
        }
      }
    : undefined;

  return (
    <NavigationContainer
      theme={navigationTheme}
      onReady={onReady}
      ref={setNavigationRef}
      onStateChange={onStateChange}
    >
      {children}
    </NavigationContainer>
  );
};

export default NavigationProvider;
