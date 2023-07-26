import React from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { shallow } from 'enzyme';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import ApprovalResultModal from './ApprovalResultModal';

jest.mock('../../hooks/useApprovalRequest');

const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
  } as any);
};

describe('ApprovalResultModal', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders if approval type is success result', () => {
    mockApprovalRequest({
      type: ApprovalTypes.RESULT_SUCCESS,
      requestData: {
        test: 'value',
      },
    } as any);

    const wrapper = shallow(<ApprovalResultModal />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders if approval type is error result', () => {
    mockApprovalRequest({
      type: ApprovalTypes.RESULT_ERROR,
      requestData: {
        test: 'value',
      },
    } as any);

    const wrapper = shallow(<ApprovalResultModal />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders nothing if no approval request', () => {
    mockApprovalRequest(undefined);

    const wrapper = shallow(<ApprovalResultModal />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders nothing if incorrect approval request type', () => {
    mockApprovalRequest({ type: ApprovalTypes.ADD_ETHEREUM_CHAIN } as any);

    const wrapper = shallow(<ApprovalResultModal />);
    expect(wrapper).toMatchSnapshot();
  });
});
