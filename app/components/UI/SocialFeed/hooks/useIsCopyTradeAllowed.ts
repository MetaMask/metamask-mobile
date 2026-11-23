import { useSelector } from 'react-redux';
import { selectIsCopyTradeAllowed } from '../../../../selectors/geolocationController';

/**
 * Whether the Copy trade button may render for the current IP geolocation.
 */
export function useIsCopyTradeAllowed(): boolean {
  return useSelector(selectIsCopyTradeAllowed);
}
