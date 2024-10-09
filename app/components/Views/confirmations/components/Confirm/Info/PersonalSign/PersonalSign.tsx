import React from 'react';
import { hexToText } from '@metamask/controller-utils';

import { sanitizeString } from '../../../../../../../util/string';
import { strings } from '../../../../../../../../locales/i18n';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import InfoRow from '../../../UI/InfoRow';
import InfoURL from '../../../UI/InfoRow/InfoValue/InfoURL';

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
      <InfoSection>
        <InfoRow label={strings('confirm.message')}>
          <InfoURL
            url={sanitizeString(hexToText(approvalRequest.requestData?.data))}
          />
        </InfoRow>
      </InfoSection>
    </>
  );
};

export default PersonalSign;
