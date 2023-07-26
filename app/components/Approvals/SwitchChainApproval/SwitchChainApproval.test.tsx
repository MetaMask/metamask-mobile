import React from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { shallow } from 'enzyme';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import SwitchChainApproval from './SwitchChainApproval';
import { networkSwitched } from '../../../actions/onboardNetwork';

jest.mock('../../hooks/useApprovalRequest');
jest.mock('../../../actions/onboardNetwork');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => jest.fn(),
}));

const URL_MOCK = 'test.com';

const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    onConfirm: jest.fn(),
  } as any);
};

describe('SwitchChainApproval', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    mockApprovalRequest({
      type: ApprovalTypes.SWITCH_ETHEREUM_CHAIN,
    } as any);

    const wrapper = shallow(<SwitchChainApproval />);

    expect(wrapper).toMatchSnapshot();
  });

  it('returns null if no approval request', () => {
    mockApprovalRequest(undefined);

    const wrapper = shallow(<SwitchChainApproval />);
    expect(wrapper).toMatchSnapshot();
  });

  it('returns null if incorrect approval request type', () => {
    mockApprovalRequest({ type: ApprovalTypes.ADD_ETHEREUM_CHAIN } as any);

    const wrapper = shallow(<SwitchChainApproval />);
    expect(wrapper).toMatchSnapshot();
  });

  it('invokes network switched on confirm', () => {
    mockApprovalRequest({
      type: ApprovalTypes.SWITCH_ETHEREUM_CHAIN,
      requestData: {
        rpcUrl: URL_MOCK,
      },
    } as any);

    const wrapper = shallow(<SwitchChainApproval />);
    wrapper.find('SwitchCustomNetwork').simulate('confirm');

    expect(networkSwitched).toHaveBeenCalledTimes(1);
    expect(networkSwitched).toHaveBeenCalledWith({
      networkUrl: URL_MOCK,
      networkStatus: true,
    });
  });
});
