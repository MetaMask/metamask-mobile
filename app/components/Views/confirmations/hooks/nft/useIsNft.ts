    import { TokenStandard } from '../../../../UI/SimulationDetails/types';
    import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
    import { useGetTokenStandardAndDetails } from '../useGetTokenStandardAndDetails';

    export const useIsNft = (): { isNft: boolean; isPending: boolean } => {
      const transactionMetadata = useTransactionMetadataRequest();
      const tokenAddress = transactionMetadata?.txParams?.to as string;
      const { details, isPending } = useGetTokenStandardAndDetails(tokenAddress);

      const isNft = 'standard' in details ? details.standard !== TokenStandard.ERC20 : false;
      return { isNft, isPending };
    };
