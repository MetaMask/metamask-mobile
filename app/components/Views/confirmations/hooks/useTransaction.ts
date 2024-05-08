import { useSelector } from 'react-redux';

import useApprovalRequest from './useApprovalRequest';

const useTransaction = () => {
  const { approvalRequest } = useApprovalRequest();
  const transactions = useSelector(
    (state) =>
      (state as any).engine.backgroundState.TransactionController.transactions,
  );

  const txId = approvalRequest?.requestData?.txId;
  const transaction = transactions.find(({ id }: any) => id === txId);

  return {
    transaction,
  };
};

export default useTransaction;
