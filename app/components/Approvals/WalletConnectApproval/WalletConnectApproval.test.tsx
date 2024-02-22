import React from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { shallow } from 'enzyme';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import WalletConnectApproval from './WalletConnectApproval';

jest.mock('../../hooks/useApprovalRequest');

const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
  } as any);
};

describe('WalletConnectApproval', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    mockApprovalRequest({
      type: ApprovalTypes.WALLET_CONNECT,
      requestData: {},
    } as any);

    const wrapper = shallow(<WalletConnectApproval />);

    expect(wrapper).toMatchSnapshot();
  });

  it('populates page information using request data', () => {
    mockApprovalRequest({
      type: ApprovalTypes.WALLET_CONNECT,
      requestData: {
        peerMeta: { name: 'testName', url: 'testUrl', icons: ['testIcon'] },
      },
    } as any);

    const wrapper = shallow(<WalletConnectApproval />);

    expect(wrapper).toMatchSnapshot();
  });

  it('sets isVisible to false if no approval request', () => {
    mockApprovalRequest(undefined);

    const wrapper = shallow(<WalletConnectApproval />);
    expect(wrapper).toMatchSnapshot();
  });

  it('sets isVisible to false if incorrect approval request type', () => {
    mockApprovalRequest({
      type: ApprovalTypes.ADD_ETHEREUM_CHAIN,
      requestData: {},
    } as any);

    const wrapper = shallow(<WalletConnectApproval />);
    expect(wrapper).toMatchSnapshot();
  });
});
