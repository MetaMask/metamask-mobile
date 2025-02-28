import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import { selectEvmChainId } from '../../../selectors/networkController';
import { selectShowFiatInTestnets } from '../../../selectors/settings';
import { TEST_NETWORK_IDS } from '../../../constants/network';

/**
 * Returns true if the fiat value should be hidden for testnet networks.
 *
 * @param providedChainId - Optional chainId to use for the check
 * @returns boolean
 */
export default function useHideFiatForTestnet(providedChainId?: Hex): boolean {
  const showFiatInTestnets = useSelector(selectShowFiatInTestnets);
  const selectedChainId = useSelector(selectEvmChainId);
  const chainId = providedChainId ?? selectedChainId;
  return TEST_NETWORK_IDS.includes(chainId) && !showFiatInTestnets;
}
