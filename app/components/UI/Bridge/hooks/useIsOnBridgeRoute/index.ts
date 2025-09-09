import { useNavigationState } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';

// Interface for nested route objects where values can be strings or nested objects
export interface RouteObject {
  [key: string]: string | RouteObject;
}

// Recursively extract all string values from a nested object
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

const bridgeRoutes = getAllRouteValues(Routes.BRIDGE);

export const useIsOnBridgeRoute = () => {
  const routes = useNavigationState((state) => state?.routes[0]?.state?.routes);

  // The final route is the one that is currently active on screen
  const currentView = routes?.[routes.length - 1]?.name;

  return bridgeRoutes.includes(currentView ?? '');
};
