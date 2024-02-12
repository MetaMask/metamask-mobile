import { NetworksChainId } from '@metamask/controller-utils';
import { SEPOLIA } from '../../../app/constants/network';

export default function migrate(state) {
  const chainId =
    state.engine.backgroundState.NetworkController.providerConfig.chainId;
  // Deprecate rinkeby, ropsten and Kovan, goerli any user that is on those we fallback to sepolia
  if (
    chainId === '4' ||
    chainId === '3' ||
    chainId === '42' ||
    chainId === '5'
  ) {
    state.engine.backgroundState.NetworkController.providerConfig = {
      chainId: NetworksChainId.sepolia,
      ticker: 'SepoliaETH',
      type: SEPOLIA,
    };
  }
  return state;
}
