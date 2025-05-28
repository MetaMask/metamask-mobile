import { useSelector } from 'react-redux';
import { safeToChecksumAddress } from '../../../../util/address';
import { parseStandardTokenTransactionData } from '../utils/transaction';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { NameType } from '../../../UI/Name/Name.types';
import { Nft } from '@metamask/assets-controllers';
import { collectiblesSelector } from '../../../../reducers/collectibles';
import useDisplayName from '../../../hooks/DisplayName/useDisplayName';
import { toHex } from '@metamask/controller-utils';

export interface UseNftResponse {
  chainId: string;

  // Optional
  isFirstPartyContractName?: boolean;
  name?: string;
  nft?: Nft;
  tokenId?: string;
}

export const useNft = (): UseNftResponse => {
  const { txParams, chainId = '' } = useTransactionMetadataRequest() ?? {};
  const tokenAddress = safeToChecksumAddress(txParams?.to) ?? '';

  const transactionData = parseStandardTokenTransactionData(txParams?.data);
  const tokenId = transactionData?.args?._value ?? undefined;

  const displayDetails = useDisplayName({
    type: NameType.EthereumAddress,
    value: tokenAddress,
    variation: chainId,
  });
  const { isFirstPartyContractName, name } = displayDetails;

  const nfts: Nft[] = useSelector(collectiblesSelector);
  const nft = tokenId ? nfts.find((c) => c.tokenId === tokenId.toString()) : undefined;

  return {
    chainId: toHex(chainId).toString(),
    isFirstPartyContractName,
    name,
    nft,
    tokenId,
  };
};
