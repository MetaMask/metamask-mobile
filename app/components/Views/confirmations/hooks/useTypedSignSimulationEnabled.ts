import { useSelector } from 'react-redux';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import {
  MessageParamsTyped,
  SignatureRequest,
  SignatureRequestType,
} from '@metamask/signature-controller';
import { selectUseTransactionSimulations } from '../../../../selectors/preferencesController';
import { isRecognizedPermit, parseTypedDataMessage } from '../utils/signature';
import { useSignatureRequest } from './useSignatureRequest';

const NON_PERMIT_SUPPORTED_TYPES_SIGNS = [
  {
    domainName: 'Seaport',
    primaryTypeList: ['BulkOrder'],
    versionList: ['1.4', '1.5', '1.6'],
  },
  {
    domainName: 'Seaport',
    primaryTypeList: ['OrderComponents'],
  },
];

const isNonPermitSupportedByDecodingAPI = (
  signatureRequest: SignatureRequest,
) => {
  const data = signatureRequest.messageParams?.data as string;
  if (!data) {
    return false;
  }

  const {
    domain: { name, version },
    primaryType,
  } = parseTypedDataMessage(data);

  return NON_PERMIT_SUPPORTED_TYPES_SIGNS.some(
    ({ domainName, primaryTypeList, versionList }) =>
      name === domainName &&
      primaryTypeList.includes(primaryType) &&
      (!versionList || versionList.includes(version)),
  );
};

export function useTypedSignSimulationEnabled() {
  const signatureRequest = useSignatureRequest();
  const useTransactionSimulations = useSelector(
    selectUseTransactionSimulations,
  );

  if (!signatureRequest) {
    return undefined;
  }

  const requestType = signatureRequest.type;
  const signatureMethod = (signatureRequest.messageParams as MessageParamsTyped)
    ?.version;

  const isTypedSignV3V4 =
    requestType === SignatureRequestType.TypedSign &&
    (signatureMethod === SignTypedDataVersion.V3 ||
      signatureMethod === SignTypedDataVersion.V4);
  const isPermit = isRecognizedPermit(signatureRequest);

  const nonPermitSupportedByDecodingAPI: boolean =
    isTypedSignV3V4 && isNonPermitSupportedByDecodingAPI(signatureRequest);

  return (
    useTransactionSimulations &&
    isTypedSignV3V4 &&
    (isPermit || nonPermitSupportedByDecodingAPI)
  );
}
