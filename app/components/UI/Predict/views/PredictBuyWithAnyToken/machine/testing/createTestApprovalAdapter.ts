import type { ApprovalPort } from '../ports';

export interface TestApprovalAdapter extends ApprovalPort {
  confirmCallCount: number;
  rejectCallCount: number;
  setTransactionId: (id: string | undefined) => void;
}

export function createTestApprovalAdapter(
  initialTransactionId?: string,
): TestApprovalAdapter {
  let transactionId: string | undefined = initialTransactionId;

  return {
    confirmCallCount: 0,
    rejectCallCount: 0,

    getApprovalTransactionId: () => transactionId,

    confirmApproval() {
      this.confirmCallCount++;
    },

    rejectApproval() {
      this.rejectCallCount++;
    },

    setTransactionId(id) {
      transactionId = id;
    },
  };
}
