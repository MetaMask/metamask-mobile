import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import WatchAssetApproval from './WatchAssetApproval';

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');

// Mock WatchAssetRequest to avoid deep render tree accessing Engine.context
jest.mock(
  '../../Views/confirmations/legacy/components/WatchAssetRequest',
  () => {
    const MockReact = jest.requireActual('react');
    return {
      __esModule: true,
      default: MockReact.forwardRef(() => null),
    };
  },
);

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

    const { toJSON } = renderWithProvider(<WatchAssetApproval />, {
      state: { engine: { backgroundState } },
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('returns null if no request data', () => {
    mockApprovalRequest({
      type: ApprovalTypes.WATCH_ASSET,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = renderWithProvider(<WatchAssetApproval />, {
      state: { engine: { backgroundState } },
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('returns null if no approval request', () => {
    mockApprovalRequest(undefined);

    const { toJSON } = renderWithProvider(<WatchAssetApproval />, {
      state: { engine: { backgroundState } },
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('sets isVisible to false if incorrect approval request type', () => {
    mockApprovalRequest({
      type: ApprovalTypes.ADD_ETHEREUM_CHAIN,
      requestData: {},
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = renderWithProvider(<WatchAssetApproval />, {
      state: { engine: { backgroundState } },
    });
    expect(toJSON()).toMatchSnapshot();
  });
});
