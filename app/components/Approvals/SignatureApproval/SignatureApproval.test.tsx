import React from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { shallow } from 'enzyme';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import SignatureApproval from './SignatureApproval';

jest.mock('../../hooks/useApprovalRequest');

const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    onConfirm: jest.fn(),
  } as any);
};

describe('SignatureApproval', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it.each([
    ApprovalTypes.ETH_SIGN,
    ApprovalTypes.PERSONAL_SIGN,
    ApprovalTypes.ETH_SIGN_TYPED_DATA,
  ])(
    'populates message params if approval type is %s',
    (approvalType: string) => {
      mockApprovalRequest({
        type: approvalType,
        requestData: { test: 'value' },
      } as any);

      const wrapper = shallow(<SignatureApproval />);

      expect(wrapper).toMatchSnapshot();
    },
  );

  it('provides no message params if no approval request', () => {
    mockApprovalRequest(undefined);

    const wrapper = shallow(<SignatureApproval />);
    expect(wrapper).toMatchSnapshot();
  });

  it('provides no message params if incorrect approval request type', () => {
    mockApprovalRequest({ type: ApprovalTypes.ADD_ETHEREUM_CHAIN } as any);

    const wrapper = shallow(<SignatureApproval />);
    expect(wrapper).toMatchSnapshot();
  });
});
