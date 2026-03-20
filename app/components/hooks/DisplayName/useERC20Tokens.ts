import { NameType } from '../../UI/Name/Name.types';
import { UseDisplayNameRequest } from './useDisplayName';
import { Hex } from '@metamask/utils';
import { useTokensData } from '../useTokensData/useTokensData';

function buildAssetId(value: string, variation: Hex): string {
  return `eip155:${parseInt(variation, 16)}/erc20:${value.toLowerCase()}`;
}

export function useERC20Tokens(requests: UseDisplayNameRequest[]) {
  const assetIds = requests
    .filter(({ type, value }) => type === NameType.EthereumAddress && value)
    .map(({ value, variation }) =>
      buildAssetId(value as string, variation as Hex),
    );

  const tokensByAssetId = useTokensData(assetIds);

  return requests.map(({ preferContractSymbol, type, value, variation }) => {
    if (type !== NameType.EthereumAddress || !value) {
      return undefined;
    }

    const token =
      tokensByAssetId[buildAssetId(value as string, variation as Hex)];
    const name =
      preferContractSymbol && token?.symbol ? token.symbol : token?.name;

    return { name, image: token?.iconUrl };
  });
}
