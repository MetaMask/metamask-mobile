import { ApprovalControllerState } from '@metamask/approval-controller';
import { useSelector } from 'react-redux';
import useApprovalRequest from './useApprovalRequest';
import Engine from '../../core/Engine';
import { ethErrors } from 'eth-rpc-errors';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('react', () => {
  const originalReact = jest.requireActual('react');

  return {
    ...originalReact,
    useCallback: (fn: any) => fn,
  };
});

jest.mock('../../core/Engine', () => ({
  acceptPendingApproval: jest.fn(),
  rejectPendingApproval: jest.fn(),
}));

const APPROVAL_REQUEST = {
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
};

const APPROVAL_REQUEST_2 = {
  id: 'testId2',
  origin: 'testOrigin2',
  type: 'eth_sign',
  time: 123456780,
  expectsResult: true,
  requestData: {
    test3: 'value3',
    test4: 'value4',
  },
  requestState: { test: 'value' },
};

const PAGE_META_MOCK = {
  test: 'value',
};

const mockSelector = (
  approvalRequests: ApprovalControllerState['pendingApprovals'],
) => {
  (useSelector as jest.MockedFn<typeof useSelector>).mockReturnValue(
    approvalRequests,
  );
};

describe('useApprovalRequest', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('approvalRequest', () => {
    it('set to approval request if one exists', () => {
      mockSelector({ [APPROVAL_REQUEST.id]: APPROVAL_REQUEST });
      expect(useApprovalRequest().approvalRequest).toEqual(APPROVAL_REQUEST);
    });

    it('set to first approval request if multiple exist', () => {
      mockSelector({
        [APPROVAL_REQUEST.id]: APPROVAL_REQUEST,
        [APPROVAL_REQUEST_2.id]: APPROVAL_REQUEST_2,
      });
      expect(useApprovalRequest().approvalRequest).toEqual(APPROVAL_REQUEST);
    });

    it('set to undefined if no approval requests exist', () => {
      mockSelector({});
      expect(useApprovalRequest().approvalRequest).toBeUndefined();
    });
  });

  describe('pageMeta', () => {
    it('set to pageMeta property in request data if set', () => {
      mockSelector({
        [APPROVAL_REQUEST.id]: {
          ...APPROVAL_REQUEST,
          requestData: { pageMeta: PAGE_META_MOCK },
        },
      });

      expect(useApprovalRequest().pageMeta).toEqual(PAGE_META_MOCK);
    });

    it('set to empty object if no request data', () => {
      mockSelector({
        [APPROVAL_REQUEST.id]: { ...APPROVAL_REQUEST, requestData: undefined },
      } as any);

      expect(useApprovalRequest().pageMeta).toEqual({});
    });

    it('set to empty object if no approval request', () => {
      mockSelector({} as any);
      expect(useApprovalRequest().pageMeta).toEqual({});
    });
  });

  describe('onConfirm', () => {
    it('invokes accept on approval controller for current approval request', () => {
      mockSelector({ [APPROVAL_REQUEST.id]: APPROVAL_REQUEST });

      useApprovalRequest().onConfirm();

      expect(Engine.acceptPendingApproval).toHaveBeenCalledTimes(1);
      expect(Engine.acceptPendingApproval).toHaveBeenCalledWith(
        APPROVAL_REQUEST.id,
        APPROVAL_REQUEST.requestData,
      );
    });

    it('does nothing if no approval request', () => {
      mockSelector({} as any);
      useApprovalRequest().onConfirm();

      expect(Engine.acceptPendingApproval).not.toHaveBeenCalled();
    });
  });

  describe('onReject', () => {
    it('invokes reject on approval controller for current approval request', () => {
      mockSelector({ [APPROVAL_REQUEST.id]: APPROVAL_REQUEST });

      useApprovalRequest().onReject();

      expect(Engine.rejectPendingApproval).toHaveBeenCalledTimes(1);
      expect(Engine.rejectPendingApproval).toHaveBeenCalledWith(
        APPROVAL_REQUEST.id,
        ethErrors.provider.userRejectedRequest(),
      );
    });

    it('does nothing if no approval request', () => {
      mockSelector({} as any);
      useApprovalRequest().onReject();

      expect(Engine.rejectPendingApproval).not.toHaveBeenCalled();
    });
  });
});
