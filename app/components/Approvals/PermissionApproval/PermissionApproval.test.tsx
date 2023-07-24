import React from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { shallow } from 'enzyme';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import PermissionApproval from './PermissionApproval';
import { createAccountConnectNavDetails } from '../../Views/AccountConnect';
import AnalyticsV2 from '../../../util/analyticsV2';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../core/Analytics';

jest.mock('../../hooks/useApprovalRequest');
jest.mock('../../../util/analyticsV2');

jest.mock('../../Views/AccountConnect', () => ({
  createAccountConnectNavDetails: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const PERMISSION_REQUEST_ID_MOCK = 'testId';

const HOST_INFO_MOCK = {
  permissions: { eth_accounts: true },
  metadata: { id: PERMISSION_REQUEST_ID_MOCK },
};

const NAV_DETAILS_MOCK = [
  {
    screen: 'testScreen',
  },
];

const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    onConfirm: jest.fn(),
  } as any);
};

const mockCreateAccountConnectNavDetails = (details: any) => {
  (
    createAccountConnectNavDetails as jest.MockedFn<
      typeof createAccountConnectNavDetails
    >
  ).mockReturnValue(details);
};

const mockSelectorState = (state: any) => {
  (useSelector as jest.MockedFn<typeof useSelector>).mockImplementation(
    (selector) => selector(state),
  );
};

describe('PermissionApproval', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('navigates', () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockApprovalRequest({
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: HOST_INFO_MOCK,
    } as any);

    mockCreateAccountConnectNavDetails(NAV_DETAILS_MOCK);

    shallow(<PermissionApproval navigation={navigationMock} />);

    expect(navigationMock.navigate).toHaveBeenCalledTimes(1);
    expect(navigationMock.navigate).toHaveBeenCalledWith(NAV_DETAILS_MOCK[0]);

    expect(createAccountConnectNavDetails).toHaveBeenCalledTimes(1);
    expect(createAccountConnectNavDetails).toHaveBeenCalledWith({
      hostInfo: HOST_INFO_MOCK,
      permissionRequestId: PERMISSION_REQUEST_ID_MOCK,
    });
  });

  it('generates analytics', () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockApprovalRequest({
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: HOST_INFO_MOCK,
    } as any);

    mockCreateAccountConnectNavDetails(NAV_DETAILS_MOCK);

    mockSelectorState({
      engine: {
        backgroundState: {
          AccountTrackerController: {
            accounts: {
              1: 'testAccount',
              2: 'testAccount2',
              3: 'testAccount3',
            },
          },
        },
      },
    });

    shallow(<PermissionApproval navigation={navigationMock} />);

    expect(AnalyticsV2.trackEvent).toHaveBeenCalledTimes(1);
    expect(AnalyticsV2.trackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.CONNECT_REQUEST_STARTED,
      {
        number_of_accounts: 3,
        source: 'PERMISSION SYSTEM',
      },
    );
  });

  it('returns null if no approval request', () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockApprovalRequest(undefined);

    expect(shallow(<PermissionApproval navigation={navigationMock} />)).toEqual(
      {},
    );
  });

  it('returns null if incorrect approval request type', () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockApprovalRequest({
      type: ApprovalTypes.ADD_ETHEREUM_CHAIN,
      requestData: HOST_INFO_MOCK,
    } as any);

    expect(shallow(<PermissionApproval navigation={navigationMock} />)).toEqual(
      {},
    );
  });

  it('returns null if no eth_accounts permission', () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockApprovalRequest({
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: { ...HOST_INFO_MOCK, permissions: { eth_accounts: false } },
    } as any);

    expect(shallow(<PermissionApproval navigation={navigationMock} />)).toEqual(
      {},
    );
  });
});
