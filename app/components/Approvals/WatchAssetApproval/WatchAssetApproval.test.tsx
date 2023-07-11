import React from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { shallow } from 'enzyme';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import WatchAssetApproval from './WatchAssetApproval';

jest.mock('../../hooks/useApprovalRequest');

const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
  } as any);
};

describe('WatchAssetApproval', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    mockApprovalRequest({
      type: ApprovalTypes.WATCH_ASSET,
      requestData: {},
    } as any);

    const wrapper = shallow(<WatchAssetApproval />);

    expect(wrapper).toMatchSnapshot();
  });

  it('returns null if no request data', () => {
    mockApprovalRequest({
      type: ApprovalTypes.WATCH_ASSET,
    } as any);

    const wrapper = shallow(<WatchAssetApproval />);

    expect(wrapper).toMatchSnapshot();
  });

  it('returns null if no approval request', () => {
    mockApprovalRequest(undefined);

    const wrapper = shallow(<WatchAssetApproval />);
    expect(wrapper).toMatchSnapshot();
  });

  it('sets isVisible to false if incorrect approval request type', () => {
    mockApprovalRequest({
      type: ApprovalTypes.ADD_ETHEREUM_CHAIN,
      requestData: {},
    } as any);

    const wrapper = shallow(<WatchAssetApproval />);
    expect(wrapper).toMatchSnapshot();
  });
});
