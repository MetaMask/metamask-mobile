import { SignatureRequest } from '@metamask/signature-controller';
import { DataTreeInput } from '../../components/data-tree/data-tree';
import { getTokenContractInDataTree } from '../../components/info/typed-sign-v3v4/message';
import { isRecognizedPermit, isRecognizedOrder } from '../../utils/signature';
import { useGetTokenStandardAndDetails } from '../useGetTokenStandardAndDetails';

export const useTokenDecimalsInTypedSignRequest = (
  signatureRequest: SignatureRequest | undefined,
  data: DataTreeInput,
  verifyingContract: string,
) => {
  const isPermit = isRecognizedPermit(signatureRequest);
  const isOrder = isRecognizedOrder(signatureRequest);
  const verifyingContractAddress =
    isPermit || isOrder ? verifyingContract : undefined;
  const {
    details: { decimalsNumber: verifyingContractTokenDecimalsNumber } = {},
  } = useGetTokenStandardAndDetails(verifyingContractAddress);

  const tokenContract = getTokenContractInDataTree(
    data as unknown as DataTreeInput,
  );
  const { details: { decimalsNumber } = {} } =
    useGetTokenStandardAndDetails(tokenContract);
  return typeof decimalsNumber === 'number'
    ? decimalsNumber
    : verifyingContractTokenDecimalsNumber;
};
