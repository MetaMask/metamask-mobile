import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';

import { selectSelectedAccountGroup } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import { selectAllNfts } from '../../../../../selectors/nftController';
import { getNetworkBadgeSource } from '../../utils/network';
import { Nft } from '../../types/token';
import { useSendScope } from './useSendScope';

export function useEVMNfts(): Nft[] {
  const { NftController, AssetsContractController, NetworkController } =
    Engine.context;
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const allNFTS = useSelector(selectAllNfts);
  const [transformedNfts, setTransformedNfts] = useState<Nft[]>([]);
  const { isSolanaOnly } = useSendScope();

  const evmAccount = selectedAccountGroup?.accounts
    .map((accountId) => internalAccountsById[accountId])
    .filter((account) => isEvmAddress(account.address))?.[0];

  useEffect(() => {
    if (!evmAccount || !allNFTS) {
      setTransformedNfts([]);
      return;
    }

    const processNfts = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawNfts: any[] = [];

      Object.keys(allNFTS).forEach((accountAddress) => {
        if (accountAddress !== evmAccount.address) {
          return;
        }
        const accountNfts = allNFTS[accountAddress];
        Object.keys(accountNfts).forEach((chainId) => {
          const chainNfts = accountNfts[chainId as `0x${string}`];
          if (chainNfts) {
            rawNfts.push(
              ...chainNfts.map((nft) => ({
                ...nft,
                chainId: chainId as `0x${string}`,
                accountId: evmAccount.id,
              })),
            );
          }
        });
      });

      const transformedResults: Nft[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const missingCollectionNfts: any[] = [];

      for (const nft of rawNfts) {
        if (nft.collection) {
          const transformed = await transformNftWithCollection(
            nft,
            evmAccount.address,
            AssetsContractController,
            NetworkController,
          );
          if (transformed) {
            transformedResults.push(transformed);
          }
        } else {
          missingCollectionNfts.push(nft);
        }
      }

      if (missingCollectionNfts.length > 0) {
        const groupedByChain = missingCollectionNfts.reduce((acc, nft) => {
          if (!acc[nft.chainId]) {
            acc[nft.chainId] = [];
          }
          acc[nft.chainId].push(nft);
          return acc;
        }, {} as Record<string, typeof missingCollectionNfts>);

        for (const [chainId, nfts] of Object.entries(groupedByChain)) {
          const typedNfts = nfts as typeof missingCollectionNfts;
          try {
            const contractAddresses = [
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...new Set(typedNfts.map((nft: any) => nft.address)),
            ];
            const collectionsResult = await NftController.getNFTContractInfo(
              contractAddresses,
              chainId as Hex,
            );

            const collectionsMap = new Map();
            contractAddresses.forEach((address, index) => {
              if (collectionsResult.collections[index]) {
                collectionsMap.set(
                  address?.toLowerCase(),
                  collectionsResult.collections[index],
                );
              }
            });

            for (const nft of typedNfts) {
              const collection = collectionsMap.get(nft.address.toLowerCase());
              if (collection) {
                const nftWithCollection = { ...nft, collection };
                const transformed = await transformNftWithCollection(
                  nftWithCollection,
                  evmAccount.address,
                  AssetsContractController,
                  NetworkController,
                );
                if (transformed) {
                  transformedResults.push(transformed);
                }
              }
            }
          } catch (error) {
            console.warn(
              'Failed to fetch collection info for chain',
              chainId,
              error,
            );
          }
        }
      }

      // Filter ERC1155 NFTs temporarily
      // This will be removed with https://github.com/MetaMask/metamask-mobile/issues/18923
      const filteredResults = transformedResults.filter(
        (nft) => nft.standard !== 'ERC1155',
      );

      setTransformedNfts(filteredResults);
    };

    processNfts();
  }, [
    evmAccount,
    allNFTS,
    NftController,
    AssetsContractController,
    NetworkController,
  ]);

  if (isSolanaOnly) {
    return [];
  }

  return transformedNfts;
}

function getValidImageUrl(
  imageUrls: (string | undefined)[],
): string | undefined {
  for (const url of imageUrls) {
    if (url && !url.startsWith('ipfs:')) {
      return url;
    }
  }
  return undefined;
}

async function transformNftWithCollection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nft: any,
  userAddress: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assetsContractController: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  networkController: any,
): Promise<Nft | null> {
  const { standard, tokenId, chainId, accountId, collection } = nft;

  if (!standard || !tokenId || !chainId || !accountId) {
    return null;
  }

  let name;
  let image;
  let balance;

  const collectionName = collection?.name || undefined;

  if (standard === 'ERC721') {
    name = nft.name || undefined;
    image = getValidImageUrl([
      nft.image,
      nft.imageUrl,
      collection?.imageUrl,
      collection?.sampleImages?.[0],
    ]);
  } else if (standard === 'ERC1155') {
    name = nft.name || undefined;
    image = getValidImageUrl([
      nft.image,
      nft.imageOriginal,
      collection?.imageUrl,
      collection?.sampleImages?.[0],
    ]);

    try {
      const networkClientId =
        networkController.findNetworkClientIdByChainId(chainId);

      const balanceResult = await assetsContractController.getERC1155BalanceOf(
        userAddress,
        nft.address,
        nft.tokenId,
        networkClientId,
      );
      balance = balanceResult.toString();
    } catch (error) {
      console.warn('Failed to fetch ERC1155 balance', error);
      balance = '0';
    }
  }

  return {
    address: nft.address,
    standard: standard as 'ERC721' | 'ERC1155',
    name,
    collectionName,
    image,
    chainId,
    tokenId,
    accountId,
    networkBadgeSource: getNetworkBadgeSource(chainId as Hex),
    balance,
  };
}
