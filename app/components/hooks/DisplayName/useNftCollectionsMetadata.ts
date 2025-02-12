import { Collection } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import { useAsyncResult } from '../useAsyncResult';
import Engine from '../../../core/Engine';
import { getTokenDetails } from '../../../util/address';

export enum TokenStandard {
  erc20 = 'ERC20',
  erc721 = 'ERC721',
  erc1155 = 'ERC1155',
}

export interface UseNftCollectionsMetadataRequest {
  chainId: string;
  contractAddress: string;
}

// For now, we only support ERC721 tokens
const SUPPORTED_NFT_TOKEN_STANDARDS = [TokenStandard.erc721];

export function useNftCollectionsMetadata(
  requests: UseNftCollectionsMetadataRequest[],
): Record<string, Record<string, Collection>> {
  const { value: collectionsMetadata } = useAsyncResult(
    () => fetchCollections(requests),
    [JSON.stringify(requests)],
  );

  return collectionsMetadata ?? {};
}

async function fetchCollections(requests: UseNftCollectionsMetadataRequest[]) {
  const valuesByChainId = requests.reduce<Record<string, string[]>>(
    (acc, { chainId, contractAddress }) => {
      acc[chainId] = [...(acc[chainId] ?? []), contractAddress.toLowerCase()];
      return acc;
    },
    {},
  );

  const chainIds = Object.keys(valuesByChainId);

  const responses = await Promise.all(
    chainIds.map((chainId) => {
      const contractAddresses = valuesByChainId[chainId];
      return fetchCollectionsForChain(contractAddresses, chainId);
    }),
  );

  return chainIds.reduce<Record<string, Record<string, Collection>>>(
    (acc, chainId, index) => {
      acc[chainId] = responses[index];
      return acc;
    },
    {},
  );
}

async function fetchCollectionsForChain(
  contractAddresses: string[],
  chainId: string,
) {
  const { NftController } = Engine.context;

  const contractStandardsResponses = await Promise.all(
    contractAddresses.map((contractAddress) =>
      getTokenDetails(contractAddress, chainId),
    ),
  );

  const supportedNFTContracts = contractAddresses.filter(
    (_contractAddress, index) =>
      SUPPORTED_NFT_TOKEN_STANDARDS.includes(
        contractStandardsResponses[index].standard as TokenStandard,
      ),
  );

  if (supportedNFTContracts.length === 0) {
    return {};
  }

  const collectionsResult = await NftController.getNFTContractInfo(
    supportedNFTContracts,
    chainId as Hex,
  );

  const collectionsData = collectionsResult.collections.reduce<
    Record<string, Collection>
  >((acc, collection, index) => {
    acc[supportedNFTContracts[index]] = {
      name: collection?.name,
      image: collection?.image,
      isSpam: collection?.isSpam,
    };
    return acc;
  }, {});

  return collectionsData;
}








