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

const InfoRowOrigin = () => {
  const { approvalRequest } = useApprovalRequest();
  const signatureRequest = useSignatureRequest();
  const chainId = signatureRequest?.chainId as Hex;
  const { isSIWEMessage } = getSIWEDetails(signatureRequest);
  const fromAddress = signatureRequest?.messageParams?.from as string;

  if (!approvalRequest) {
    return null;
  }

  return (
    <InfoSection
      testID={ConfirmationPageSectionsSelectorIDs.ORIGIN_INFO_SECTION}
    >
      <InfoRow
        label={strings('confirm.request_from')}
        tooltip={strings('confirm.personal_sign_tooltip')}
      >
        <DisplayURL url={approvalRequest.origin} />
      </InfoRow>
      {isSIWEMessage && (
        <InfoRow
          label={strings('confirm.signing_in_with')}
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
