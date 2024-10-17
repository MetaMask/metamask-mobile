import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import { selectShowFiatInTestnets } from '../../../selectors/settings';
import { TEST_NETWORK_IDS } from '../../../constants/network';
import { useChainId } from '../../../selectors/hooks';
/**
 * Returns true if the fiat value should be hidden for testnet networks.
 *
 * @param providedChainId - Optional chainId to use for the check
 * @returns boolean
 */
export default function useHideFiatForTestnet(providedChainId?: Hex): boolean {
  const showFiatInTestnets = useSelector(selectShowFiatInTestnets);
  const selectedChainId = useChainId();
  const chainId = providedChainId ?? selectedChainId;
  return TEST_NETWORK_IDS.includes(chainId) && !showFiatInTestnets;
}
