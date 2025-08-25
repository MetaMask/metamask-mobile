import { Hex } from '@metamask/utils';
import React from 'react';

import { ConfirmationRowComponentIDs } from '../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../../locales/i18n';
import { useSignatureRequest } from '../../../hooks/signatures/useSignatureRequest';
import { useTransactionBatchesMetadata } from '../../../hooks/transactions/useTransactionBatchesMetadata';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import { getSIWEDetails } from '../../../utils/signature';
import InfoRow from '../../UI/info-row';
import AlertRow from '../../UI/info-row/alert-row';
import { RowAlertKey } from '../../UI/info-row/alert-row/constants';
import InfoSection from '../../UI/info-row/info-section';
import Address from '../../UI/info-row/info-value/address';
import DisplayURL from '../../UI/info-row/info-value/display-url';

const InfoRowOrigin = ({
  isSignatureRequest,
}: {
  isSignatureRequest: boolean;
}) => {
  const signatureRequest = useSignatureRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadata();
  const { approvalRequest } = useApprovalRequest();
  let chainId: Hex | undefined;
  let fromAddress: string | undefined;
  let isSIWEMessage: boolean | undefined;
  let url: string | undefined;
  if (isSignatureRequest) {
    if (!signatureRequest || !approvalRequest) return null;

    chainId = signatureRequest?.chainId;
    isSIWEMessage = getSIWEDetails(signatureRequest).isSIWEMessage;
    fromAddress = signatureRequest?.messageParams?.from;
    url = approvalRequest?.requestData?.meta?.url;
  } else if (transactionMetadata) {
    chainId = transactionMetadata?.chainId;
    fromAddress = transactionMetadata?.txParams?.from;
    url = transactionMetadata?.origin;
  } else if (transactionBatchesMetadata) {
    chainId = transactionBatchesMetadata?.chainId;
    fromAddress = transactionBatchesMetadata?.from;
    url = transactionBatchesMetadata?.origin;
  } else {
    return null;
  }

  return (
    <InfoSection testID={ConfirmationRowComponentIDs.ORIGIN_INFO}>
      <AlertRow
        alertField={RowAlertKey.RequestFrom}
        label={strings('confirm.label.request_from')}
        tooltip={strings(
          isSignatureRequest
            ? 'confirm.personal_sign_tooltip'
            : 'confirm.transaction_tooltip',
        )}
      >
        <DisplayURL url={url ?? ''} />
      </AlertRow>
      {isSignatureRequest && isSIWEMessage && (
        <InfoRow
          label={strings('confirm.label.signing_in_with')}
          testID={ConfirmationRowComponentIDs.SIWE_SIGNING_ACCOUNT_INFO}
        >
          <Address address={fromAddress} chainId={chainId} />
        </InfoRow>
      )}
    </InfoSection>
  );
};

export default InfoRowOrigin;
