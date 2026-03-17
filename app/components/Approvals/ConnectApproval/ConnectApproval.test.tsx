import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import ConnectApproval from './ConnectApproval';
import { backgroundState } from '../../../util/test/initial-root-state';

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    })),
  }),
}));

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  return {
    context: {
      PhishingController: {
        maybeUpdateState: jest.fn(),
        test: jest.fn(() => ({ result: false })),
        scanUrl: jest.fn(() => ({ recommendedAction: 'NONE' })),
      },
      KeyringController: {
        getAccountKeyringType: () => Promise.resolve('HD Key Tree'),
        state: {
          keyrings: [
            {
              accounts: ['0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756'],
              metadata: {
                id: '01JNG71B7GTWH0J1TSJY9891S0',
                name: '',
              },
            },
          ],
        },
      },
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
    },
  };
});

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    pageMeta: {},
    onConfirm: jest.fn(),
    onReject: jest.fn(),
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

describe('ConnectApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    mockApprovalRequest({
      type: ApprovalTypes.CONNECT_ACCOUNTS,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = renderWithProvider(<ConnectApproval navigation={{}} />, { state: mockInitialState });

    expect(toJSON()).toMatchSnapshot();
  });

  it('sets isVisible to false if no approval request', () => {
    mockApprovalRequest(undefined);

    const { toJSON } = renderWithProvider(<ConnectApproval navigation={{}} />, { state: mockInitialState });
    expect(toJSON()).toMatchSnapshot();
  });

  it('sets isVisible to false if incorrect approval request type', () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockApprovalRequest({ type: ApprovalTypes.ADD_ETHEREUM_CHAIN } as any);

    const { toJSON } = renderWithProvider(<ConnectApproval navigation={{}} />, { state: mockInitialState });
    expect(toJSON()).toMatchSnapshot();
  });
});
