import { SignatureRequest } from '@metamask/signature-controller';
import { parseTypedDataMessage } from './signature';

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

export const isNonPermitSupportedByDecodingAPI = (
  signatureRequest: SignatureRequest,
) => {
  const data = signatureRequest.messageParams?.data as string;
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
