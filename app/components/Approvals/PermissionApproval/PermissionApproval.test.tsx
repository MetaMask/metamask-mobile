import React from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import PermissionApproval from './PermissionApproval';
import { createAccountConnectNavDetails } from '../../Views/AccountConnect';
import AnalyticsV2 from '../../../util/analytics/analyticsV2';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../core/Analytics';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import { render } from '@testing-library/react-native';

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

  it('navigates', async () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockApprovalRequest({
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: HOST_INFO_MOCK,
    } as any);

    mockCreateAccountConnectNavDetails(NAV_DETAILS_MOCK);

    render(<PermissionApproval navigation={navigationMock} />);

    expect(navigationMock.navigate).toHaveBeenCalledTimes(1);
    expect(navigationMock.navigate).toHaveBeenCalledWith(NAV_DETAILS_MOCK[0]);

    expect(createAccountConnectNavDetails).toHaveBeenCalledTimes(1);
    expect(createAccountConnectNavDetails).toHaveBeenCalledWith({
      hostInfo: HOST_INFO_MOCK,
      permissionRequestId: PERMISSION_REQUEST_ID_MOCK,
    });
  });

  it('generates analytics', async () => {
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
          ...initialBackgroundState,
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

    render(<PermissionApproval navigation={navigationMock} />);

    expect(AnalyticsV2.trackEvent).toHaveBeenCalledTimes(1);
    expect(AnalyticsV2.trackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.CONNECT_REQUEST_STARTED,
      {
        number_of_accounts: 3,
        source: 'PERMISSION SYSTEM',
      },
    );
  });

  it('does not navigate if no approval request', async () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockApprovalRequest(undefined);

    render(<PermissionApproval navigation={navigationMock} />);

    expect(navigationMock.navigate).toHaveBeenCalledTimes(0);
  });

  it('does not navigate if incorrect approval request type', async () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockApprovalRequest({
      type: ApprovalTypes.ADD_ETHEREUM_CHAIN,
      requestData: HOST_INFO_MOCK,
    } as any);

    render(<PermissionApproval navigation={navigationMock} />);

    expect(navigationMock.navigate).toHaveBeenCalledTimes(0);
  });

  it('does not navigate if no eth_accounts permission', async () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockApprovalRequest({
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: { ...HOST_INFO_MOCK, permissions: { eth_accounts: false } },
    } as any);

    render(<PermissionApproval navigation={navigationMock} />);

    expect(navigationMock.navigate).toHaveBeenCalledTimes(0);
  });

  it('does not navigate if still processing', async () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockCreateAccountConnectNavDetails(NAV_DETAILS_MOCK);

    mockApprovalRequest({
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: HOST_INFO_MOCK,
    } as any);

    const { rerender } = render(
      <PermissionApproval navigation={navigationMock} />,
    );

    mockApprovalRequest({
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: HOST_INFO_MOCK,
    } as any);

    rerender(<PermissionApproval navigation={navigationMock} />);

    expect(navigationMock.navigate).toHaveBeenCalledTimes(1);
  });

  it('navigates if previous processing finished', async () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockCreateAccountConnectNavDetails(NAV_DETAILS_MOCK);

    mockApprovalRequest({
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: HOST_INFO_MOCK,
    } as any);

    const { rerender } = render(
      <PermissionApproval navigation={navigationMock} />,
    );

    mockApprovalRequest(undefined);

    rerender(<PermissionApproval navigation={navigationMock} />);

    mockApprovalRequest({
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: HOST_INFO_MOCK,
    } as any);

    rerender(<PermissionApproval navigation={navigationMock} />);

    expect(navigationMock.navigate).toHaveBeenCalledTimes(2);
  });
});
