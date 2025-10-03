import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { shallow } from 'enzyme';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import SwitchChainApproval from './SwitchChainApproval';
import { networkSwitched } from '../../../actions/onboardNetwork';
// eslint-disable-next-line import/no-namespace
import * as networks from '../../../util/networks';
import { Caip25CaveatType, Caip25EndowmentPermissionName } from '@metamask/chain-agnostic-permission';

jest.mock('../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../selectors/networkController'),
  selectEvmNetworkConfigurationsByChainId: () => ({
    '0x1': {
      name: 'Ethereum Mainnet',
    }
  }),
}));

jest.mock('../../hooks/useNetworksByNamespace/useNetworksByNamespace', () => ({
  useNetworksByNamespace: () => ({
    networks: [
      {
        id: 'eip155:1',
        name: 'Ethereum',
        caipChainId: 'eip155:1',
        isSelected: false,
        imageSource:
          'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880',
        networkTypeOrRpcUrl: 'https://mock-url.com',
      },
    ],
  }),
  NetworkType: {
    Popular: 'popular',
    Custom: 'custom',
  },
}));

const mockSelectNetwork = jest.fn();
jest.mock('../../hooks/useNetworkSelection/useNetworkSelection', () => ({
  useNetworkSelection: () => ({
    selectCustomNetwork: jest.fn(),
    selectPopularNetwork: jest.fn(),
    selectNetwork: mockSelectNetwork,
  }),
}));

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');
jest.mock('../../../actions/onboardNetwork');

jest.mock('../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setTokenNetworkFilter: jest.fn(),
    },
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => jest.fn(),
  useSelector: jest.fn((selector) => selector()),
}));

const mockApprovalRequest = (approvalRequest?: unknown) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    onConfirm: jest.fn(),
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const URL_MOCK = 'test.com';

const mockApprovalRequestData = {
    metadata: {
      rpcUrl: URL_MOCK,
    },
    diff: {
      permissionDiffMap: {
        [Caip25EndowmentPermissionName]: {
          [Caip25CaveatType]: {
            requiredScopes: {
              'eip155:1': {
                accounts: [],
              },
            },
            optionalScopes: {},
          },
        },
      },
    },
};

describe('SwitchChainApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(false);
    jest
      .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
      .mockReturnValue(false);
  });

  it('renders', () => {
    mockApprovalRequest({
      type: ApprovalTypes.SWITCH_ETHEREUM_CHAIN,
      requestData: mockApprovalRequestData
    });

    const wrapper = shallow(<SwitchChainApproval />);

    expect(wrapper).toMatchSnapshot();
  });

  it('returns null if no approval request', () => {
    mockApprovalRequest(undefined);

    const wrapper = shallow(<SwitchChainApproval />);
    expect(wrapper).toMatchSnapshot();
  });

  it('returns null if incorrect approval request type', () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockApprovalRequest({ type: ApprovalTypes.ADD_ETHEREUM_CHAIN } as any);

    const wrapper = shallow(<SwitchChainApproval />);
    expect(wrapper).toMatchSnapshot();
  });

  it('calls networkSwitched action when confirm is pressed', () => {
    mockApprovalRequest({
      type: ApprovalTypes.SWITCH_ETHEREUM_CHAIN,
      requestData: mockApprovalRequestData
    });

    const wrapper = shallow(<SwitchChainApproval />);
    wrapper.find('SwitchCustomNetwork').simulate('confirm');

    expect(networkSwitched).toHaveBeenCalledTimes(1);
    expect(networkSwitched).toHaveBeenCalledWith({
      networkUrl: URL_MOCK,
      networkStatus: true,
    });
  });

  it('sets token network filter when portfolio view is enabled', () => {
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
    mockApprovalRequest({
      type: ApprovalTypes.SWITCH_ETHEREUM_CHAIN,
      requestData: mockApprovalRequestData
    });

    const wrapper = shallow(<SwitchChainApproval />);
    wrapper.find('SwitchCustomNetwork').simulate('confirm');

    expect(networkSwitched).toHaveBeenCalledTimes(1);
    expect(networkSwitched).toHaveBeenCalledWith({
      networkUrl: URL_MOCK,
      networkStatus: true,
    });
  });

  it('calls selectNetwork when both portfolio view and remove global network selector are enabled', () => {
    jest
      .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
      .mockReturnValue(true);
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);

    mockApprovalRequest({
      type: ApprovalTypes.SWITCH_ETHEREUM_CHAIN,
      requestData: mockApprovalRequestData
    });

    const wrapper = shallow(<SwitchChainApproval />);
    wrapper.find('SwitchCustomNetwork').simulate('confirm');

    expect(mockSelectNetwork).toHaveBeenCalledTimes(1);
    expect(mockSelectNetwork).toHaveBeenCalledWith('0x1');
    expect(networkSwitched).toHaveBeenCalledTimes(1);
    expect(networkSwitched).toHaveBeenCalledWith({
      networkUrl: URL_MOCK,
      networkStatus: true,
    });
  });

  it('does not call selectNetwork when remove global network selector is disabled', () => {
    jest
      .spyOn(networks, 'isRemoveGlobalNetworkSelectorEnabled')
      .mockReturnValue(false);
    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);

    mockApprovalRequest({
      type: ApprovalTypes.SWITCH_ETHEREUM_CHAIN,
      requestData: mockApprovalRequestData
    });

    const wrapper = shallow(<SwitchChainApproval />);
    wrapper.find('SwitchCustomNetwork').simulate('confirm');

    expect(mockSelectNetwork).not.toHaveBeenCalled();
    expect(networkSwitched).toHaveBeenCalledTimes(1);
    expect(networkSwitched).toHaveBeenCalledWith({
      networkUrl: URL_MOCK,
      networkStatus: true,
    });
  });
});
