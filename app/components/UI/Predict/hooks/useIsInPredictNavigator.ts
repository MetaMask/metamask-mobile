import { useNavigationState } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';

// Interface for nested route objects where values can be strings or nested objects
export interface RouteObject {
  [key: string]: string | RouteObject;
}

/**
 * Recursively extract all string values from a nested object
 * @param obj - Nested route object
 * @returns Array of all route string values
 */
export const getAllRouteValues = (obj: RouteObject): string[] => {
  const values: string[] = [];

  for (const value of Object.values(obj)) {
    if (typeof value === 'string') {
      values.push(value);
    } else if (typeof value === 'object' && value !== null) {
      values.push(...getAllRouteValues(value));
    }
  }

  return values;
};

// Pre-compute all Predict route names for performance
const predictRoutes = getAllRouteValues(Routes.PREDICT as RouteObject);

/**
 * Hook to detect if the user is currently within the Predict navigator stack.
 *
 * Uses React Navigation's useNavigationState to inspect the current navigation state
 * and check if any route in the active navigation tree belongs to the Predict navigator.
 *
 * This is more reliable than checking entryPoint because it reflects the actual
 * navigation state rather than how the user initially entered.
 *
 * @returns boolean - true if currently inside Predict navigator, false otherwise
 *
 * @example
 * ```tsx
 * const isInPredictNavigator = useIsInPredictNavigator();
 *
 * // Use for conditional logic
 * if (isInPredictNavigator) {
 *   // Navigate directly to screen
 *   navigation.navigate(Routes.PREDICT.MARKET_DETAILS);
 * } else {
 *   // Navigate through PREDICT.ROOT stack
 *   navigation.navigate(Routes.PREDICT.ROOT, {
 *     screen: Routes.PREDICT.MARKET_DETAILS
 *   });
 * }
 * ```
 */
export const useIsInPredictNavigator = (): boolean => {
  const isInPredict = useNavigationState((state) => {
    // Check all routes in the navigation state
    // The navigation state contains the stack of screens
    // If any screen name matches a Predict route, we're inside the Predict navigator
    const routes = state?.routes[0]?.state?.routes;

    if (!routes || routes.length === 0) {
      return false;
    }

    // The final route is the one that is currently active on screen
    const currentView = routes[routes.length - 1]?.name;

    return predictRoutes.includes(currentView ?? '');
  });

  return isInPredict;
};
