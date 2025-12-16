import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import PermissionApproval from './PermissionApproval';
import { createAccountConnectNavDetails } from '../../Views/AccountConnect';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { render } from '@testing-library/react-native';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import useOriginSource from '../../hooks/useOriginSource';
import {
  Caip25EndowmentPermissionName,
  getAllScopesFromPermission,
} from '@metamask/chain-agnostic-permission';
import { MetaMetricsRequestedThrough } from '../../../core/Analytics/MetaMetrics.types';
import { MESSAGE_TYPE } from '../../../core/createTracingMiddleware';
import { getApiAnalyticsProperties } from '../../../util/metrics/MultichainAPI/getApiAnalyticsProperties';
import { selectPendingApprovals } from '../../../selectors/approvalController';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');
jest.mock('../../../components/hooks/useMetrics');

jest.mock('../../Views/AccountConnect', () => ({
  createAccountConnectNavDetails: jest.fn(),
}));

jest.mock('../../hooks/useOriginSource');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@metamask/chain-agnostic-permission', () => ({
  ...jest.requireActual('@metamask/chain-agnostic-permission'),
  getAllScopesFromPermission: jest.fn(),
}));

jest.mock(
  '../../../util/metrics/MultichainAPI/getApiAnalyticsProperties',
  () => ({
    getApiAnalyticsProperties: jest.fn(),
  }),
);

const PERMISSION_REQUEST_ID_MOCK = 'testId';

const HOST_INFO_MOCK = {
  permissions: { [Caip25EndowmentPermissionName]: { caveats: [] } },
  metadata: { id: PERMISSION_REQUEST_ID_MOCK },
};

const NAV_DETAILS_MOCK = [
  {
    screen: 'testScreen',
  },
];

const useSelectorMocks = {
  selectPendingApprovals: jest.fn().mockReturnValue({}),
  selectAccountsLength: jest.fn().mockReturnValue(0),
};

(useSelector as jest.MockedFn<typeof useSelector>).mockImplementation(
  (selector: unknown): unknown => {
    if (selector === selectPendingApprovals) {
      return useSelectorMocks.selectPendingApprovals();
    }
    if (selector === selectAccountsLength) {
      return useSelectorMocks.selectAccountsLength();
    }
    return undefined;
  },
);

// TODO: Replace "any" with type
const mockApprovalRequest = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  approvalRequest?: ApprovalRequest<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pendingApprovals?: Record<string, ApprovalRequest<any>>,
) => {
  useSelectorMocks.selectPendingApprovals.mockReturnValue(
    pendingApprovals || {},
  );
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    onConfirm: jest.fn(),
    onReject: jest.fn(),
    pageMeta: {},
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCreateAccountConnectNavDetails = (details: any) => {
  (
    createAccountConnectNavDetails as jest.MockedFn<
      typeof createAccountConnectNavDetails
    >
  ).mockReturnValue(details);
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAccountsLength = (accountsLength: number) => {
  useSelectorMocks.selectAccountsLength.mockReturnValue(accountsLength);
};

const mockTrackEvent = jest.fn();

(useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
  trackEvent: mockTrackEvent,
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
  enable: jest.fn(),
  addTraitsToUser: jest.fn(),
  createDataDeletionTask: jest.fn(),
  checkDataDeleteStatus: jest.fn(),
  getDeleteRegulationCreationDate: jest.fn(),
  getDeleteRegulationId: jest.fn(),
  isDataRecorded: jest.fn(),
  isEnabled: jest.fn(),
  getMetaMetricsId: jest.fn(),
});

describe('PermissionApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useOriginSource as jest.Mock).mockImplementation(() => 'IN_APP_BROWSER');
    (
      getAllScopesFromPermission as jest.MockedFn<
        typeof getAllScopesFromPermission
      >
    ).mockReturnValue([]);
    (
      getApiAnalyticsProperties as jest.MockedFn<
        typeof getApiAnalyticsProperties
      >
    ).mockReturnValue({
      api_source: MetaMetricsRequestedThrough.EthereumProvider,
      method: MESSAGE_TYPE.ETH_REQUEST_ACCOUNTS,
    });
    mockAccountsLength(0);
  });

  it('navigates', async () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockApprovalRequest({
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: HOST_INFO_MOCK,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      requestData: {
        ...HOST_INFO_MOCK,
        metadata: {
          ...HOST_INFO_MOCK.metadata,
          isEip1193Request: true,
        },
      },
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockCreateAccountConnectNavDetails(NAV_DETAILS_MOCK);

    mockAccountsLength(3);

    render(<PermissionApproval navigation={navigationMock} />);

    const expectedEvent = MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.CONNECT_REQUEST_STARTED,
    )
      .addProperties({
        number_of_accounts: 3,
        source: 'IN_APP_BROWSER',
        chain_id_list: [],
        method: MESSAGE_TYPE.ETH_REQUEST_ACCOUNTS,
        api_source: MetaMetricsRequestedThrough.EthereumProvider,
      })
      .build();

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(expectedEvent);
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
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(<PermissionApproval navigation={navigationMock} />);

    expect(navigationMock.navigate).toHaveBeenCalledTimes(0);
  });

  it(`does not navigate if there is a permission diff for the ${Caip25EndowmentPermissionName} permission`, async () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockApprovalRequest({
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: {
        ...HOST_INFO_MOCK,
        diff: {
          permissionDiffMap: {
            [Caip25EndowmentPermissionName]: {},
          },
        },
      },
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(<PermissionApproval navigation={navigationMock} />);

    expect(navigationMock.navigate).toHaveBeenCalledTimes(0);
  });

  it(`does not navigate if no ${Caip25EndowmentPermissionName} permission`, async () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockApprovalRequest({
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: {
        ...HOST_INFO_MOCK,
        permissions: { [Caip25EndowmentPermissionName]: false },
      },
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(<PermissionApproval navigation={navigationMock} />);

    expect(navigationMock.navigate).toHaveBeenCalledTimes(0);
  });

  it('re-runs effect when pendingApprovals changes', async () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockCreateAccountConnectNavDetails(NAV_DETAILS_MOCK);

    const approvalRequest = {
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: HOST_INFO_MOCK,
      id: PERMISSION_REQUEST_ID_MOCK,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const pendingApprovals1 = {
      [PERMISSION_REQUEST_ID_MOCK]: approvalRequest,
    };

    mockApprovalRequest(approvalRequest, pendingApprovals1);

    const { rerender } = render(
      <PermissionApproval navigation={navigationMock} />,
    );

    expect(navigationMock.navigate).toHaveBeenCalledTimes(1);

    const anotherApprovalRequest = {
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: HOST_INFO_MOCK,
      id: 'anotherRequestId',
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const pendingApprovals2 = {
      [PERMISSION_REQUEST_ID_MOCK]: approvalRequest,
      anotherRequestId: anotherApprovalRequest,
    };

    mockApprovalRequest(approvalRequest, pendingApprovals2);

    rerender(<PermissionApproval navigation={navigationMock} />);

    // Effect should re-run when pendingApprovals content changes, causing navigation again
    expect(navigationMock.navigate).toHaveBeenCalledTimes(2);
  });

  it('navigates when new approval added after queue cleared', async () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockCreateAccountConnectNavDetails(NAV_DETAILS_MOCK);

    const approvalRequest1 = {
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: HOST_INFO_MOCK,
      id: PERMISSION_REQUEST_ID_MOCK,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const pendingApprovals1 = {
      [PERMISSION_REQUEST_ID_MOCK]: approvalRequest1,
    };

    mockApprovalRequest(approvalRequest1, pendingApprovals1);

    const { rerender } = render(
      <PermissionApproval navigation={navigationMock} />,
    );

    // Clear pending approvals (approval was processed/removed)
    mockApprovalRequest(undefined, {});

    rerender(<PermissionApproval navigation={navigationMock} />);

    const approvalRequest2 = {
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: HOST_INFO_MOCK,
      id: 'newRequestId',
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const pendingApprovals2 = {
      newRequestId: approvalRequest2,
    };

    mockApprovalRequest(approvalRequest2, pendingApprovals2);

    rerender(<PermissionApproval navigation={navigationMock} />);

    expect(navigationMock.navigate).toHaveBeenCalledTimes(2);
  });
});
