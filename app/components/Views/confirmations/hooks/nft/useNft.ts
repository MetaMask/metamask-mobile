import { useSelector } from 'react-redux';
import { Nft } from '@metamask/assets-controllers';
import { toHex } from '@metamask/controller-utils';
import { collectiblesSelector } from '../../../../../reducers/collectibles';
import { selectAllNftContracts } from '../../../../../selectors/nftController';
import { safeToChecksumAddress } from '../../../../../util/address';
import { parseStandardTokenTransactionData } from '../../utils/transaction';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

export interface UseNftResponse {
  chainId: string;

  // Optional
  name?: string;
  nft?: Nft;
  tokenId?: string;
}

/** Finds the first NFT contract that matches the token address */
const useNftContract = (chainId: string, tokenAddress: string) => {
  const nftContractsAll = useSelector(selectAllNftContracts);

  const accounts = Object.keys(nftContractsAll);
  const nftContracts = accounts.flatMap(
    (account) => nftContractsAll[account]?.[chainId as `0x${string}`] ?? [],
  );

  return nftContracts.find(
    (nft) => nft.address.toLowerCase() === tokenAddress.toLowerCase(),
  );
};

export const useNft = (): UseNftResponse => {
  const { txParams, chainId = '' } = useTransactionMetadataRequest() ?? {};
  const tokenAddress = safeToChecksumAddress(txParams?.to) ?? '';

  const transactionData = parseStandardTokenTransactionData(txParams?.data);
  const tokenId = (
    transactionData?.args?._value ?? transactionData?.args[3]
  )?.toString();

  const nfts: Nft[] = useSelector(collectiblesSelector);
  const nft = tokenId ? nfts.find((c) => c.tokenId === tokenId) : undefined;

  const nftContract = useNftContract(chainId, tokenAddress);

  return {
    chainId: toHex(chainId).toString(),
    name: nftContract?.name,
    nft,
    tokenId,
  };
};
