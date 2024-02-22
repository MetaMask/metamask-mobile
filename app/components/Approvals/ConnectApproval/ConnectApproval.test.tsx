import React from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { shallow } from 'enzyme';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import ConnectApproval from './ConnectApproval';

jest.mock('../../hooks/useApprovalRequest');

const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
  } as any);
};

describe('ConnectApproval', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    mockApprovalRequest({
      type: ApprovalTypes.CONNECT_ACCOUNTS,
    } as any);

    const wrapper = shallow(<ConnectApproval navigation={{}} />);

    expect(wrapper).toMatchSnapshot();
  });

  it('sets isVisible to false if no approval request', () => {
    mockApprovalRequest(undefined);

    const wrapper = shallow(<ConnectApproval navigation={{}} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('sets isVisible to false if incorrect approval request type', () => {
    mockApprovalRequest({ type: ApprovalTypes.ADD_ETHEREUM_CHAIN } as any);

    const wrapper = shallow(<ConnectApproval navigation={{}} />);
    expect(wrapper).toMatchSnapshot();
  });
});
