import { useSelector } from 'react-redux';
import { selectApprovalFlows } from '../../selectors/approvalController';
import { isEqual } from 'lodash';

const useApprovalFlow = () => {
  const approvalFlows = useSelector(selectApprovalFlows, isEqual);

  const approvalFlow = approvalFlows.length
    ? approvalFlows?.slice(-1)[0]
    : undefined;

  return {
    approvalFlow,
  };
};

export default useApprovalFlow;
