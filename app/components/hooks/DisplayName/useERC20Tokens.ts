import { NameType } from '../../UI/Name/Name.types';
import { UseDisplayNameRequest } from './useDisplayName';
import { selectERC20TokensByChain } from '../../../selectors/tokenListController';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';

export function useERC20Tokens(requests: UseDisplayNameRequest[]) {
  const erc20TokensByChain = useSelector(selectERC20TokensByChain);

  return requests.map(({ preferContractSymbol, type, value, variation }) => {
    if (type !== NameType.EthereumAddress || !value) {
      return undefined;
    }

    const contractAddress = value.toLowerCase();
    const chainId = variation as Hex;

    const {
      name: tokenName,
      symbol,
      iconUrl: image,
    } = erc20TokensByChain[chainId]?.data?.[contractAddress] ?? {};

    const name = preferContractSymbol && symbol ? symbol : tokenName;

    return { name, image };
  });
}
