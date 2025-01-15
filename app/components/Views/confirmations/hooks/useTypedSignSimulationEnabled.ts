import { useSelector } from 'react-redux';
import { ApprovalRequest } from '@metamask/approval-controller';
import { MESSAGE_TYPE } from '../../../../core/createTracingMiddleware';
import { selectUseTransactionSimulations } from '../../../../selectors/preferencesController';
import { isRecognizedPermit, parseTypedDataMessage } from '../utils/signature';
import useApprovalRequest from './useApprovalRequest';

type ApprovalRequestType = ApprovalRequest<{ data: string }>;

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
  approvalRequest: ApprovalRequestType,
) => {
  const data = approvalRequest.requestData?.data as string;
  if (!data) { return false; }

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

export default function useTypesSignSimulationEnabled() {
  const { approvalRequest } = useApprovalRequest();
  const useTransactionSimulations = useSelector(
    selectUseTransactionSimulations,
  );

  if (!approvalRequest) {
    return undefined;
  }

  const signatureMethod = approvalRequest?.requestData?.signatureMethod;
  const isTypedSignV3V4 =
    signatureMethod === MESSAGE_TYPE.ETH_SIGN_TYPED_DATA_V4 ||
    signatureMethod === MESSAGE_TYPE.ETH_SIGN_TYPED_DATA_V3;
  const isPermit = isRecognizedPermit(approvalRequest);

  const nonPermitSupportedByDecodingAPI: boolean =
    isTypedSignV3V4 && isNonPermitSupportedByDecodingAPI(approvalRequest);

  return (
    useTransactionSimulations &&
    isTypedSignV3V4 &&
    (isPermit || nonPermitSupportedByDecodingAPI)
  );
}
