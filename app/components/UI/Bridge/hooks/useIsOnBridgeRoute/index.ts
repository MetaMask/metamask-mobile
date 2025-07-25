import { useNavigationState } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';

export const useIsOnBridgeRoute = () => {
  const routes = useNavigationState((state) => state?.routes[0]?.state?.routes);
  return routes ? routes.some((route) => route?.name === Routes.BRIDGE.ROOT) : false;
};
