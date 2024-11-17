import React from 'react';

import { strings } from '../../../../../../../../locales/i18n';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import InfoRow from '../../../UI/InfoRow';
import DisplayURL from '../../../UI/InfoRow/InfoValue/DisplayURL';
import Message from './Message';
import Simulation from '../../NoChangeSimulation';

const TypedSignV1 = () => {
  const { approvalRequest } = useApprovalRequest();

  if (!approvalRequest) {
    return null;
  }

  return (
    <>
      <Simulation />
      <InfoSection>
        <InfoRow
          label={strings('confirm.request_from')}
          tooltip={strings('confirm.personal_sign_tooltip')}
        >
          <DisplayURL url={approvalRequest.origin} />
        </InfoRow>
      </InfoSection>
      <Message />
    </>
  );
};

export default TypedSignV1;
