import React from 'react';

import { ConfirmationPageSectionsSelectorIDs } from '../../../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../../../../locales/i18n';
import useApprovalRequest from '../../../../../hooks/useApprovalRequest';
import InfoSection from '../../../../UI/InfoRow/InfoSection';
import InfoRow from '../../../../UI/InfoRow';
import DisplayURL from '../../../../UI/InfoRow/InfoValue/DisplayURL';

const InfoRowOrigin = () => {
  const { approvalRequest } = useApprovalRequest();

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
    </InfoSection>
  );
};

export default InfoRowOrigin;
