import React from 'react';
import { useSelector } from 'react-redux';
import { selectUseTransactionSimulations } from '../../../../../../../selectors/preferencesController';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import { isRecognizedPermit } from '../../../../utils/signature';
import InfoRowOrigin from '../Shared/InfoRowOrigin';
import PermitSimulation from '../../Simulation/PermitSimulation';
import Message from './Message';

const TypedSignV3V4 = () => {
  const { approvalRequest } = useApprovalRequest();
  const useSimulation = useSelector(
    selectUseTransactionSimulations,
  );

  if (!approvalRequest) {
    return null;
  }

  const isPermit = isRecognizedPermit(approvalRequest);

  return (
    <>
      {isPermit && useSimulation && <PermitSimulation />}
      <InfoRowOrigin />
      <Message />
    </>
  );
};

export default TypedSignV3V4;
