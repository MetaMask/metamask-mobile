import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import ConnectApproval from './ConnectApproval';

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');

// Mock AccountApproval to avoid deep render tree accessing Engine.context
jest.mock('../../UI/AccountApproval', () => {
  const MockReact = jest.requireActual('react');
  return {
    __esModule: true,
    default: MockReact.forwardRef(() => null),
  };
});

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

    const { toJSON } = renderWithProvider(<ConnectApproval navigation={{}} />, {
      state: { engine: { backgroundState } },
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('sets isVisible to false if no approval request', () => {
    mockApprovalRequest(undefined);

    const { toJSON } = renderWithProvider(<ConnectApproval navigation={{}} />, {
      state: { engine: { backgroundState } },
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('sets isVisible to false if incorrect approval request type', () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockApprovalRequest({ type: ApprovalTypes.ADD_ETHEREUM_CHAIN } as any);

    const { toJSON } = renderWithProvider(<ConnectApproval navigation={{}} />, {
      state: { engine: { backgroundState } },
    });
    expect(toJSON()).toMatchSnapshot();
  });
});
