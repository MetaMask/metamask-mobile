import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Collection } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import { selectChainId } from '../../../selectors/networkController';
import { useAsyncResult } from '../useAsyncResult';
import Engine from '../../../core/Engine';
import { getTokenDetails } from '../../../util/address';

export interface UseNftCollectionsMetadataRequest {
  value: string;
  chainId?: string;
}

interface CollectionsData {
  [key: string]: Collection;
}

export enum TokenStandard {
  erc20 = 'ERC20',
  erc721 = 'ERC721',
  erc1155 = 'ERC1155',
}

// For now, we only support ERC721 tokens
const SUPPORTED_NFT_TOKEN_STANDARDS = [TokenStandard.erc721];

async function fetchCollections(
  memoisedContracts: string[],
  chainId: Hex,
): Promise<CollectionsData> {
  const { NftController } = Engine.context;

  const contractStandardsResponses = await Promise.all(
    memoisedContracts.map((contractAddress) =>
      getTokenDetails(contractAddress),
    ),
  );

  const supportedNFTContracts = memoisedContracts.filter(
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
    chainId,
  );

  const collectionsData: CollectionsData = collectionsResult.collections.reduce(
    (acc: CollectionsData, collection: Collection, index: number) => {
      acc[supportedNFTContracts[index]] = {
        name: collection?.name,
        image: collection?.image,
        isSpam: collection?.isSpam,
      };
      return acc;
    },
    {},
  );
  return collectionsData;
}

export function useNftCollectionsMetadata(
  requests: UseNftCollectionsMetadataRequest[],
  providedChainId?: Hex,
) {
  const chainId = useSelector(selectChainId) || providedChainId;

  const memoisedContracts = useMemo(() => requests
      .filter(({ value }) => value)
      .map(({ value }) => value.toLowerCase()), [requests]);

  const { value: collectionsMetadata } = useAsyncResult(
    () => fetchCollections(memoisedContracts, chainId),
    [JSON.stringify(memoisedContracts), chainId],
  );

  return collectionsMetadata || {};
}
