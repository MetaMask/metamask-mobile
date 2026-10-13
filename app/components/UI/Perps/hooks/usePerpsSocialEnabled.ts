import { useSelector } from 'react-redux';
import { selectPerpsSocialEnabledFlag } from '../selectors/featureFlags';

export const usePerpsSocialEnabled = (): boolean =>
  useSelector(selectPerpsSocialEnabledFlag);
