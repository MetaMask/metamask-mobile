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
import { getFormattedIpfsUrl } from '@metamask/assets-controllers';
import useIpfsGateway from '../../../../hooks/useIpfsGateway';
import Logger from '../../../../../util/Logger';

export function useEVMNfts(): Nft[] {
  const { NftController, AssetsContractController, NetworkController } =
    Engine.context;
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const allNFTS = useSelector(selectAllNfts);
  const [transformedNfts, setTransformedNfts] = useState<Nft[]>([]);
  const { isSolanaOnly } = useSendScope();
  const ipfsGateway = useIpfsGateway();

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

      for (const nft of rawNfts) {
        const transformed = await transformNft(
          ipfsGateway,
          nft,
          evmAccount.address,
          AssetsContractController,
          NetworkController,
        );
        if (transformed) {
          transformedResults.push(transformed);
        }
      }

      setTransformedNfts(transformedResults);
    };

    processNfts();
  }, [
    ipfsGateway,
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

async function getValidImageUrl(
  ipfsGateway: string,
  imageUrls: (string | undefined)[],
): Promise<string | undefined> {
  for (const url of imageUrls) {
    if (url) {
      if (!url.startsWith('ipfs:')) {
        return url;
      }

      try {
        const ipfsUrl = await getFormattedIpfsUrl(ipfsGateway, url, false);
        if (!ipfsUrl) {
          continue;
        }
        return ipfsUrl;
      } catch {
        Logger.log(`Failed to resolve IPFS URL for ${url}`);
      }
    }
  }
  return undefined;
}

async function transformNft(
  ipfsGateway: string,
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
    image = await getValidImageUrl(ipfsGateway, [
      nft.image,
      nft.imageUrl,
      collection?.imageUrl,
      collection?.sampleImages?.[0],
    ]);
  } else if (standard === 'ERC1155') {
    name = nft.name || undefined;
    image = await getValidImageUrl(ipfsGateway, [
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
