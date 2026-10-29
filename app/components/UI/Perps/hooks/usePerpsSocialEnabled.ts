import { useSelector } from 'react-redux';
import { selectIsPerpsSocialEnabled } from '../selectors/featureFlags';

export const usePerpsSocialEnabled = (): boolean =>
  useSelector(selectIsPerpsSocialEnabled);
