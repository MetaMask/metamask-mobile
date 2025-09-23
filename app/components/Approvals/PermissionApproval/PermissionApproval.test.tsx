import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import PermissionApproval from './PermissionApproval';
import { createAccountConnectNavDetails } from '../../Views/AccountConnect';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { backgroundState } from '../../../util/test/initial-root-state';
import { render } from '@testing-library/react-native';
import mockedUseMetrics from '../../hooks/useMetrics/useMetrics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import useOriginSource from '../../hooks/useOriginSource';
import { Caip25EndowmentPermissionName } from '@metamask/chain-agnostic-permission';
import { MetaMetricsRequestedThrough } from '../../../core/Analytics/MetaMetrics.types';
import { MESSAGE_TYPE } from '../../../core/createTracingMiddleware';

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');

// mock useMetrics with default __mocks__
jest.mock('../../../components/hooks/useMetrics/useMetrics');

jest.mock('../../Views/AccountConnect', () => ({
  createAccountConnectNavDetails: jest.fn(),
}));

jest.mock('../../hooks/useOriginSource');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

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
const mockSelectorState = (state: any) => {
  (useSelector as jest.MockedFn<typeof useSelector>).mockImplementation(
    (selector) => selector(state),
  );
};

const { trackEvent } = mockedUseMetrics();
const mockTrackEvent = jest.mocked(trackEvent);

describe('PermissionApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useOriginSource as jest.Mock).mockImplementation(() => 'IN_APP_BROWSER');
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

    mockSelectorState({
      engine: {
        backgroundState: {
          ...backgroundState,
          AccountTrackerController: {
            accounts: {
              1: 'testAccount',
              2: 'testAccount2',
              3: 'testAccount3',
            },
            accountsByChainId: {
              '0x1': {
                1: 'testAccount',
                2: 'testAccount2',
                3: 'testAccount3',
              },
            },
          },
        },
      },
    });

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

  it('does not navigate if still processing', async () => {
    const navigationMock = {
      navigate: jest.fn(),
    };

    mockCreateAccountConnectNavDetails(NAV_DETAILS_MOCK);

    mockApprovalRequest({
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: HOST_INFO_MOCK,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { rerender } = render(
      <PermissionApproval navigation={navigationMock} />,
    );

    mockApprovalRequest({
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: HOST_INFO_MOCK,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { rerender } = render(
      <PermissionApproval navigation={navigationMock} />,
    );

    mockApprovalRequest(undefined);

    rerender(<PermissionApproval navigation={navigationMock} />);

    mockApprovalRequest({
      type: ApprovalTypes.REQUEST_PERMISSIONS,
      requestData: HOST_INFO_MOCK,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    rerender(<PermissionApproval navigation={navigationMock} />);

    expect(navigationMock.navigate).toHaveBeenCalledTimes(2);
  });
});
