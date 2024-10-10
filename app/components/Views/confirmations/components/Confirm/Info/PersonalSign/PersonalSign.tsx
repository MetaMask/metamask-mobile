import React from 'react';

import { strings } from '../../../../../../../../locales/i18n';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import InfoRow from '../../../UI/InfoRow';
import InfoURL from '../../../UI/InfoRow/InfoValue/InfoURL';
import Message from './Message';

const PersonalSign = () => {
  const { approvalRequest } = useApprovalRequest();

  if (!approvalRequest) {
    return null;
  }

  return (
    <>
      <InfoSection>
        <InfoRow
          label={strings('confirm.request_from')}
          tooltip={strings('confirm.personal_sign_tooltip')}
        >
          <InfoURL url={approvalRequest.origin} />
        </InfoRow>
      </InfoSection>
      <Message />
    </>
  );
};

export default PersonalSign;
