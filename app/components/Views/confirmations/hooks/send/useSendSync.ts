import { useRouteParams } from './useRouteParams';
import { useSendMaxValueRefresher } from './useSendMaxValueRefresher';

export const useSendSync = () => {
  useRouteParams();
  useSendMaxValueRefresher();
};
