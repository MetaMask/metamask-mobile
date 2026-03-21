import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import WatchAssetApproval from './WatchAssetApproval';
import { backgroundState } from '../../../util/test/initial-root-state';

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  return {
    context: {
      KeyringController: {
        getAccountKeyringType: () => Promise.resolve('HD Key Tree'),
        state: {
          keyrings: [
            {
              accounts: ['0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756'],
              metadata: { id: '01JNG71B7GTWH0J1TSJY9891S0', name: '' },
            },
          ],
        },
      },
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
      AssetsContractController: {
        getERC20BalanceOf: jest.fn().mockResolvedValue('0'),
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

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    })),
  }),
}));

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

describe('WatchAssetApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    mockApprovalRequest({
      type: ApprovalTypes.WATCH_ASSET,
      requestData: {
        asset: {
          address: '0x0000000000000000000000000000000000000001',
          symbol: 'TEST',
          decimals: 18,
        },
        interactingAddress: '0x0000000000000000000000000000000000000002',
      },
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = renderWithProvider(<WatchAssetApproval />, { state: mockInitialState });

    expect(toJSON()).toMatchSnapshot();
  });

  it('returns null if no request data', () => {
    mockApprovalRequest({
      type: ApprovalTypes.WATCH_ASSET,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = renderWithProvider(<WatchAssetApproval />, { state: mockInitialState });

    expect(toJSON()).toMatchSnapshot();
  });

  it('returns null if no approval request', () => {
    mockApprovalRequest(undefined);

    const { toJSON } = renderWithProvider(<WatchAssetApproval />, { state: mockInitialState });
    expect(toJSON()).toMatchSnapshot();
  });

  it('sets isVisible to false if incorrect approval request type', () => {
    mockApprovalRequest({
      type: ApprovalTypes.ADD_ETHEREUM_CHAIN,
      requestData: {},
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = renderWithProvider(<WatchAssetApproval />, { state: mockInitialState });
    expect(toJSON()).toMatchSnapshot();
  });
});
