import React from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { shallow } from 'enzyme';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import {
  ApprovalFlowState,
  ApprovalRequest,
} from '@metamask/approval-controller';
import FlowLoaderModal from './FlowLoaderModal';
import useApprovalFlow from '../../hooks/useApprovalFlow';

jest.mock('../../hooks/useApprovalRequest');
jest.mock('../../hooks/useApprovalFlow');

const APPROVAL_FLOW_MOCK: ApprovalFlowState = {
  id: 'testId1',
  loadingText: 'testLoadingText',
};

const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
  } as any);
};

const mockApprovalFlow = (approvalFlow?: ApprovalFlowState) => {
  (useApprovalFlow as jest.MockedFn<typeof useApprovalFlow>).mockReturnValue({
    approvalFlow,
  } as any);
};

describe('FlowLoaderModal', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    mockApprovalFlow(APPROVAL_FLOW_MOCK);
    mockApprovalRequest(undefined);

    const wrapper = shallow(<FlowLoaderModal />);

    expect(wrapper).toMatchSnapshot();
  });

  it('returns null if no approval flow', () => {
    mockApprovalFlow(undefined);
    mockApprovalRequest(undefined);

    const wrapper = shallow(<FlowLoaderModal />);
    expect(wrapper).toMatchSnapshot();
  });

  it('returns null if approval request', () => {
    mockApprovalFlow(APPROVAL_FLOW_MOCK);
    mockApprovalRequest({ type: ApprovalTypes.CONNECT_ACCOUNTS } as any);

    const wrapper = shallow(<FlowLoaderModal />);
    expect(wrapper).toMatchSnapshot();
  });
});
