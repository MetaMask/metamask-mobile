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

  const isNft =
    !isPending && details.standard !== undefined
      ? details.standard !== TokenStandard.ERC20
      : undefined;
  return { isNft, isPending };
};
