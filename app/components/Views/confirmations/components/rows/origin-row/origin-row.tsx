import React from 'react';

import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { strings } from '../../../../../../../locales/i18n';
import { useSignatureRequest } from '../../../hooks/signatures/useSignatureRequest';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useApprovalInfo } from '../../../hooks/useApprovalInfo';
import { isDappOrigin } from '../../../utils/origin';
import InfoRow from '../../UI/info-row';
import AlertRow from '../../UI/info-row/alert-row';
import { RowAlertKey } from '../../UI/info-row/alert-row/constants';
import InfoSection from '../../UI/info-row/info-section';
import Address from '../../UI/info-row/info-value/address';
import DisplayURL from '../../UI/info-row/info-value/display-url';

const OriginRow = () => {
  const { approvalRequest, pageMeta } = useApprovalRequest();
  const signatureRequest = useSignatureRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const { chainId, fromAddress, isSIWEMessage, url } = useApprovalInfo() ?? {};

  // Get the request source to determine if the origin is verifiable
  const requestSource = pageMeta?.analytics?.request_source as
    | string
    | undefined;

  if (!approvalRequest) {
    return null;
  }

  const isDappTransaction = isDappOrigin(url);
  if (transactionMetadata && !isDappTransaction) {
    return null;
  }

  return (
    <InfoSection testID={ConfirmationRowComponentIDs.ORIGIN_INFO}>
      <AlertRow
        alertField={RowAlertKey.RequestFrom}
        label={strings('confirm.label.request_from')}
        tooltip={strings(
          signatureRequest
            ? 'confirm.personal_sign_tooltip'
            : 'confirm.transaction_tooltip',
        )}
      >
        <DisplayURL url={url ?? ''} requestSource={requestSource} />
      </AlertRow>
      {signatureRequest && isSIWEMessage && (
        <InfoRow
          label={strings('confirm.label.signing_in_with')}
          testID={ConfirmationRowComponentIDs.SIWE_SIGNING_ACCOUNT_INFO}
        >
          <Address address={fromAddress ?? ''} chainId={chainId ?? ''} />
        </InfoRow>
      )}
    </InfoSection>
  );
};

export default OriginRow;
