import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { shallow } from 'enzyme';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import ConnectApproval from './ConnectApproval';

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

describe('ConnectApproval', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    mockApprovalRequest({
      type: ApprovalTypes.CONNECT_ACCOUNTS,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockApprovalRequest({ type: ApprovalTypes.ADD_ETHEREUM_CHAIN } as any);

    const wrapper = shallow(<ConnectApproval navigation={{}} />);
    expect(wrapper).toMatchSnapshot();
  });
});
