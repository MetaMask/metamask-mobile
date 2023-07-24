import { ApprovalControllerState } from '@metamask/approval-controller';
import {
  selectApprovalFlows,
  selectPendingApprovals,
} from './approvalController';

const PENDING_APPROVALS_MOCK: ApprovalControllerState['pendingApprovals'] = {
  testId1: {
    id: 'testId1',
    origin: 'testOrigin1',
    type: 'eth_sign',
    time: 123456789,
    expectsResult: false,
    requestData: {
      test: 'value',
      test2: 'value2',
    },
    requestState: {},
  },
  testId2: {
    id: 'testId2',
    origin: 'testOrigin2',
    type: 'transaction',
    time: 123456780,
    expectsResult: true,
    requestData: {
      test3: 'value2',
    },
    requestState: {
      test4: 'value3',
    },
  },
};

const APPROVAL_FLOWS_MOCK: ApprovalControllerState['approvalFlows'] = [
  {
    id: 'testId1',
    loadingText: 'testLoadingText1',
  },
  {
    id: 'testId2',
    loadingText: 'testLoadingText2',
  },
];

describe('Approval Controller Selectors', () => {
  describe('selectPendingApprovals', () => {
    it('returns the pending approvals object from the approval controller', () => {
      expect(
        selectPendingApprovals({
          engine: {
            backgroundState: {
              ApprovalController: {
                pendingApprovals: PENDING_APPROVALS_MOCK,
              },
            },
          } as any,
        }),
      ).toEqual(PENDING_APPROVALS_MOCK);
    });
  });

  describe('selectApprovalFlows', () => {
    it('returns the approvals flow array from the approval controller', () => {
      expect(
        selectApprovalFlows({
          engine: {
            backgroundState: {
              ApprovalController: {
                approvalFlows: APPROVAL_FLOWS_MOCK,
              },
            },
          } as any,
        }),
      ).toEqual(APPROVAL_FLOWS_MOCK);
    });
  });
});
