/* eslint-disable @typescript-eslint/ban-types */
import { useMemo } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
// import { MetaMetricsEvents } from '../../core/Analytics';
import { useMetrics } from '../../components/hooks/useMetrics';

const { trackEvent } = useMetrics();

type NavigationParams = object | undefined;

export type NavigationDetails<T extends NavigationParams = NavigationParams> =
  readonly [string, T];

export const createNavigationDetails =
  <T extends NavigationParams>(name: string, screen?: string) =>
  (params?: T) =>
    [name, screen ? { screen, params } : params] as const;

type RouteParams<T extends object> = RouteProp<{ route: T }, 'route'>;
export const useParams = <
  T extends object | undefined,
  Strict extends boolean = false,
>(
  defaults?: Partial<T>,
) => {
  const route = useRoute<RouteParams<{ params: T }>>();
  const navParams = route.params;
  const params = useMemo(
    () => ({ ...defaults, ...navParams }),
    [defaults, navParams],
  );
  return params as Strict extends false ? T : Partial<T>;
};

export const connectionChangeHandler = (
  isConnected: boolean,
  connected: boolean,
  setConnected: (connected: boolean) => void,
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any,
) => {
  try {
    if (isConnected === null) return;

    // Only navigate to OfflineModeView after a sustained offline period (e.g., 3 seconds)
    const debounceTimeout = setTimeout(() => {
      if (connected && isConnected === false) {
        navigation.navigate('OfflineModeView');
      }
    }, 3000);

    // Clear timeout if connection stabilizes
    if (isConnected === true) {
      clearTimeout(debounceTimeout);
    }

    if (connected !== isConnected && isConnected !== null) {
      setConnected(isConnected);
    }
  } catch (e) {
    console.error('User dropped connection', e);
    // trackEvent(MetaMetricsEvents.CONNECTION_DROPPED);
  }
};
