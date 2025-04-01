import React from 'react';
import { Hex } from '@metamask/utils';

import { ConfirmationPageSectionsSelectorIDs } from '../../../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../../../../locales/i18n';
import useApprovalRequest from '../../../../../hooks/useApprovalRequest';
import { getSIWEDetails } from '../../../../../utils/signature';
import { useSignatureRequest } from '../../../../../hooks/useSignatureRequest';
import Address from '../../../../UI/InfoRow/InfoValue/Address';
import DisplayURL from '../../../../UI/InfoRow/InfoValue/DisplayURL';
import InfoRow from '../../../../UI/InfoRow';
import InfoSection from '../../../../UI/InfoRow/InfoSection';
import AlertRow from '../../../../UI/InfoRow/AlertRow';
import { RowAlertKey } from '../../../../UI/InfoRow/AlertRow/constants';
import { useTransactionMetadataRequest } from '../../../../../hooks/useTransactionMetadataRequest';

const InfoRowOrigin = (
  { isSignatureRequest }: { isSignatureRequest: boolean }
) => {
  const signatureRequest = useSignatureRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const { approvalRequest } = useApprovalRequest();
  let chainId: Hex | undefined;
  let fromAddress: string | undefined;
  let isSIWEMessage: boolean | undefined;
  let url: string | undefined;
  if (isSignatureRequest) {
    chainId = signatureRequest?.chainId as Hex;
    isSIWEMessage = getSIWEDetails(signatureRequest).isSIWEMessage;
    fromAddress = signatureRequest?.messageParams?.from as string;
    url = approvalRequest?.requestData?.meta?.url as string;
  } else {
    chainId = transactionMetadata?.chainId as Hex;
    fromAddress = transactionMetadata?.txParams?.from as string;
    url = transactionMetadata?.origin as string;
  }

  if (isSignatureRequest && !approvalRequest) {
    return null;
  }

  return (
    <InfoSection
      testID={ConfirmationPageSectionsSelectorIDs.ORIGIN_INFO_SECTION}
    >
      <AlertRow
        alertField={RowAlertKey.RequestFrom}
        label={strings('confirm.label.request_from')}
        tooltip={strings(isSignatureRequest ?
          'confirm.personal_sign_tooltip' :
          'confirm.transaction_tooltip'
        )}
      >
        <DisplayURL url={url} />
      </AlertRow>
      {isSignatureRequest && isSIWEMessage && (
        <InfoRow
          label={strings('confirm.label.signing_in_with')}
          testID={
            ConfirmationPageSectionsSelectorIDs.SIWE_SIGNING_ACCOUNT_INFO_SECTION
          }
        >
          <Address address={fromAddress} chainId={chainId} />
        </InfoRow>
      )}
    </InfoSection>
  );
};

export default InfoRowOrigin;
