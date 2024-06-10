import { useSelector } from 'react-redux';
import { selectChainId } from '../../../selectors/networkController';
import { selectShowFiatInTestnets } from '../../../reducers/settings';
import { TEST_NETWORK_IDS } from '../../../constants/network';

/**
 * Returns true if the fiat value should be hidden for testnet networks.
 *
 * @returns boolean
 */
export default function useHideFiatForTestnet(): boolean {
  const showFiatInTestnets = useSelector(selectShowFiatInTestnets);
  const chainId = useSelector(selectChainId);
  return TEST_NETWORK_IDS.includes(chainId) && !showFiatInTestnets;
}
