import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { shallow } from 'enzyme';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import SignatureApproval from './SignatureApproval';

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    onConfirm: jest.fn(),
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

describe('SignatureApproval', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it.each([ApprovalTypes.PERSONAL_SIGN, ApprovalTypes.ETH_SIGN_TYPED_DATA])(
    'populates message params if approval type is %s',
    (approvalType: string) => {
      mockApprovalRequest({
        type: approvalType,
        requestData: { test: 'value' },
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockApprovalRequest({ type: ApprovalTypes.ADD_ETHEREUM_CHAIN } as any);

    const wrapper = shallow(<SignatureApproval />);
    expect(wrapper).toMatchSnapshot();
  });
});
