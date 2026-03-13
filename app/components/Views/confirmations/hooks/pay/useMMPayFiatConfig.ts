import { useSelector } from 'react-redux';
import {
  MetaMaskPayFiatFlags,
  selectMetaMaskPayFiatFlags,
} from '../../../../../selectors/featureFlagController/confirmations';

export function useMMPayFiatConfig(): MetaMaskPayFiatFlags {
  return useSelector(selectMetaMaskPayFiatFlags);
}
