import { ApprovalControllerState } from '@metamask/approval-controller';
import { useSelector } from 'react-redux';
import useApprovalFlow from './useApprovalFlow';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const APPROVAL_FLOW_MOCK = {
  id: 'testId1',
  loadingText: 'testLoadingText1',
};

const APPROVAL_FLOW_MOCK_2 = {
  id: 'testId2',
  loadingText: 'testLoadingText2',
};

const mockSelector = (
  approvalFlows: ApprovalControllerState['approvalFlows'],
) => {
  (useSelector as jest.MockedFn<typeof useSelector>).mockReturnValue(
    approvalFlows,
  );
};

describe('useApprovalFlow', () => {
  it('returns the approval flow if one exists', () => {
    mockSelector([APPROVAL_FLOW_MOCK]);
    expect(useApprovalFlow()).toEqual({ approvalFlow: APPROVAL_FLOW_MOCK });
  });

  it('returns the last approval flow if multiple exist', () => {
    mockSelector([APPROVAL_FLOW_MOCK, APPROVAL_FLOW_MOCK_2]);
    expect(useApprovalFlow()).toEqual({ approvalFlow: APPROVAL_FLOW_MOCK_2 });
  });

  it('returns undefined if no approval flows exist', () => {
    mockSelector([]);
    expect(useApprovalFlow()).toEqual({ approvalFlow: undefined });
  });
});
