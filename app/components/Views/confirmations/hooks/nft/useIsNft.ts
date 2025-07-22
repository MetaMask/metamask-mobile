import { NetworkClientId } from '@metamask/network-controller';

import { TokenStandard } from '../../../../UI/SimulationDetails/types';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useGetTokenStandardAndDetails } from '../useGetTokenStandardAndDetails';

export const useIsNft = (): { isNft?: boolean; isPending: boolean } => {
  const transactionMetadata = useTransactionMetadataRequest();
  const tokenAddress = transactionMetadata?.txParams?.to as string;
  const networkClientId =
    transactionMetadata?.networkClientId as NetworkClientId;
  const { details, isPending } = useGetTokenStandardAndDetails(
    tokenAddress,
    networkClientId,
  );

  // Native token / loading state
  if (isPending || details?.standard === undefined) {
    return { isNft: undefined, isPending };
  }

  // NFT check
  const isNft =
    details.standard === TokenStandard.ERC1155 ||
    details.standard === TokenStandard.ERC721;

  return { isNft, isPending };
};
