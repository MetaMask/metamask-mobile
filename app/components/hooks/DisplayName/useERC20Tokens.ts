import { NameType } from '../../UI/Name/Name.types';
import { UseDisplayNameRequest } from './useDisplayName';
import { Hex } from '@metamask/utils';
import { useTokensData } from '../useTokensData/useTokensData';
import { buildEvmCaip19AssetId } from '../../../util/multichain/buildEvmCaip19AssetId';

export function useERC20Tokens(requests: UseDisplayNameRequest[]) {
  const assetIds = requests
    .filter(({ type, value }) => type === NameType.EthereumAddress && value)
    .map(({ value, variation }) =>
      buildEvmCaip19AssetId(value as string, variation as Hex),
    );

  const tokensByAssetId = useTokensData(assetIds);

  return requests.map(({ preferContractSymbol, type, value, variation }) => {
    if (type !== NameType.EthereumAddress || !value) {
      return undefined;
    }

    const token =
      tokensByAssetId[buildEvmCaip19AssetId(value as string, variation as Hex)];
    const name =
      preferContractSymbol && token?.symbol ? token.symbol : token?.name;

    return { name, image: token?.iconUrl };
  });
}
