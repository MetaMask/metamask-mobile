import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { fireEvent } from '@testing-library/react-native';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import SwitchChainApproval from './SwitchChainApproval';
import SwitchCustomNetwork from '../../UI/SwitchCustomNetwork';
import { networkSwitched } from '../../../actions/onboardNetwork';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import renderWithProvider from '../../../util/test/renderWithProvider';

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');
jest.mock('../../../actions/onboardNetwork', () => ({
  networkSwitched: jest.fn(() => ({ type: 'NETWORK_SWITCHED' })),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

const URL_MOCK = 'test.com';

const mockApprovalRequest = (approvalRequest?: unknown) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    onConfirm: jest.fn(),
    onReject: jest.fn(),
    pageMeta: { url: URL_MOCK },
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

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
  });

  it('renders', () => {
    mockApprovalRequest({
      type: ApprovalTypes.SWITCH_ETHEREUM_CHAIN,
      requestData: mockApprovalRequestData,
    });

    const { toJSON } = renderWithProvider(<SwitchChainApproval />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('returns null if no approval request', () => {
    mockApprovalRequest(undefined);

    const { toJSON } = renderWithProvider(<SwitchChainApproval />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('returns null if incorrect approval request type', () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockApprovalRequest({ type: ApprovalTypes.ADD_ETHEREUM_CHAIN } as any);

    const { toJSON } = renderWithProvider(<SwitchChainApproval />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls networkSwitched action when confirm is pressed', () => {
    mockApprovalRequest({
      type: ApprovalTypes.SWITCH_ETHEREUM_CHAIN,
      requestData: mockApprovalRequestData,
    });

    const { UNSAFE_getByType } = renderWithProvider(<SwitchChainApproval />);
    const switchCustomNetwork = UNSAFE_getByType(SwitchCustomNetwork);
    fireEvent(switchCustomNetwork, 'confirm');

    expect(networkSwitched).toHaveBeenCalledTimes(1);
    expect(networkSwitched).toHaveBeenCalledWith({
      networkUrl: URL_MOCK,
      networkStatus: true,
    });
  });
});
